import { command, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

import { describeApiError, throwApiError } from '$lib/utils/utils';
import { createFortyTwoClient } from '$lib/server/fourtytwo/client';
import { getValkey } from '$lib/server/valkey';
import { cachedJson, invalidateCachedJson } from '$lib/server/cache';
import type { Slots } from '$lib/server/fourtytwo/schemas';

const SLOT_SETTINGS_TTL_SECONDS = 6 * 60 * 60;
const OPEN_SLOTS_TTL_SECONDS = 30;
const SLOT_DELETE_INTERVAL_MS = 550;
const SLOT_DELETE_RETRY_DELAYS_MS = [700, 1_400];

function openSlotsCacheKey(userId: number): string {
	return `user:${userId}:open-slots`;
}

function futureSlots(slots: Slots): Slots {
	return slots.filter((slot) => new Date(slot.end_at).getTime() > Date.now());
}
export const getOpenSlots = query(async () => {
	const { locals } = getRequestEvent();
	const session = locals.session;
	if (!session) {
		error(401, 'Not signed in');
	}

	return cachedJson(openSlotsCacheKey(session.userId), OPEN_SLOTS_TTL_SECONDS, async () => {
		const client = createFortyTwoClient(session.accessToken);
		const result = await client.slots.mine();
		return result.match(futureSlots, (apiError) => throwApiError(apiError));
	});
});

export const getOpenSlotsFresh = query(async () => {
	const session = requireSession();
	const client = createFortyTwoClient(session.accessToken);
	return refreshOpenSlots(client, session.userId);
});

export const createOpenSlot = command(
	v.object({ beginAt: v.string(), endAt: v.string() }),
	async ({ beginAt, endAt }) => {
		const session = requireSession();
		const client = createFortyTwoClient(session.accessToken);
		(await client.slots.create({ userId: session.userId, beginAt, endAt })).match(
			() => undefined,
			(apiError) => throwApiError(apiError)
		);
		return refreshOpenSlots(client, session.userId);
	}
);

export const deleteOpenSlots = command(
	v.object({ ids: v.pipe(v.array(v.number()), v.minLength(1)) }),
	async ({ ids }) => {
		const session = requireSession();
		const client = createFortyTwoClient(session.accessToken);
		const failedIds: number[] = [];
		for (const [index, id] of ids.entries()) {
			if (index > 0) await delay(SLOT_DELETE_INTERVAL_MS);
			if (!(await removeSlotWithRetry(client, id))) failedIds.push(id);
		}

		// Reconcile with 42 even after a partial failure. This also replaces the
		// cached list, so deleting a slot directly in the intranet cannot leave a
		// ghost range after the next fresh load.
		const slots = await refreshOpenSlots(client, session.userId);
		return { slots, failedIds };
	}
);

export const updateOpenSlot = command(
	v.object({
		ids: v.pipe(v.array(v.number()), v.minLength(1)),
		beginAt: v.string(),
		endAt: v.string()
	}),
	async ({ ids, beginAt, endAt }) => {
		const session = requireSession();
		const client = createFortyTwoClient(session.accessToken);
		const [retainedId, ...obsoleteIds] = ids;
		if (retainedId === undefined) error(400, 'A slot id is required');

		const failedIds: number[] = [];
		for (const [index, id] of obsoleteIds.entries()) {
			if (index > 0) await delay(SLOT_DELETE_INTERVAL_MS);
			if (!(await removeSlotWithRetry(client, id))) failedIds.push(id);
		}

		if (obsoleteIds.length > 0) await delay(SLOT_DELETE_INTERVAL_MS);
		const updated = await client.slots.update(retainedId, {
			userId: session.userId,
			beginAt,
			endAt
		});
		const updateError = updated.isErr() ? describeApiError(updated.error) : null;

		const slots = await refreshOpenSlots(client, session.userId);
		return { slots, failedIds, updateError };
	}
);

async function removeSlotWithRetry(
	client: ReturnType<typeof createFortyTwoClient>,
	id: number
): Promise<boolean> {
	for (let attempt = 0; attempt <= SLOT_DELETE_RETRY_DELAYS_MS.length; attempt += 1) {
		const result = await client.slots.remove(id);
		if (
			result.isOk() ||
			(result.isErr() && result.error.type === 'http' && result.error.status === 404)
		)
			return true;

		if (!result.isErr() || !isTransientDeleteError(result.error)) return false;
		const retryDelay = SLOT_DELETE_RETRY_DELAYS_MS[attempt];
		if (retryDelay === undefined) return false;
		await delay(retryDelay);
	}
	return false;
}

function isTransientDeleteError(apiError: Parameters<typeof throwApiError>[0]): boolean {
	return (
		apiError.type === 'network' ||
		(apiError.type === 'http' && (apiError.status === 429 || apiError.status >= 500))
	);
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function requireSession() {
	const { locals } = getRequestEvent();
	if (!locals.session) error(401, 'Not signed in');
	return locals.session;
}

async function refreshOpenSlots(
	client: ReturnType<typeof createFortyTwoClient>,
	userId: number
): Promise<Slots> {
	await invalidateCachedJson(openSlotsCacheKey(userId));
	return cachedJson(openSlotsCacheKey(userId), OPEN_SLOTS_TTL_SECONDS, async () => {
		const result = await client.slots.mine();
		return result.match(futureSlots, (apiError) => throwApiError(apiError));
	});
}

export const getSlotSettings = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.session) error(401, 'Not signed in');
	const valkey = await getValkey();
	const cacheKey = `campus-slot-settings:${locals.session.userId}`;
	const cached = await valkey.get(cacheKey);
	if (cached) {
		try {
			const value = JSON.parse(cached) as { minimumDurationMinutes?: unknown };
			if (typeof value.minimumDurationMinutes === 'number') {
				return { minimumDurationMinutes: value.minimumDurationMinutes };
			}
		} catch {
			await valkey.del(cacheKey);
		}
	}

	const client = createFortyTwoClient(locals.session.accessToken);
	const user = (await client.users.me()).match(
		(value) => value,
		(apiError) => throwApiError(apiError)
	);
	const campusId =
		user.campus_users.find((campus) => campus.is_primary)?.campus_id ??
		user.campus_users[0]?.campus_id;
	if (!campusId) {
		const settings = { minimumDurationMinutes: 30 };
		await valkey.set(cacheKey, JSON.stringify(settings), { EX: SLOT_SETTINGS_TTL_SECONDS });
		return settings;
	}

	const settings = (await client.campuses.get(campusId)).match(
		(campus) => ({ minimumDurationMinutes: Math.max(15, campus.minimum_slot_duration ?? 30) }),
		(apiError) => throwApiError(apiError)
	);
	await valkey.set(cacheKey, JSON.stringify(settings), { EX: SLOT_SETTINGS_TTL_SECONDS });
	return settings;
});
