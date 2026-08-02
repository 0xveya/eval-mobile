import { command, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

import { throwApiError } from '$lib/utils/utils';
import { createFortyTwoClient } from '$lib/server/fourtytwo/client';
import { getValkey } from '$lib/server/valkey';
import { cachedJson, invalidateCachedJson } from '$lib/server/cache';
import type { Slots } from '$lib/server/fourtytwo/schemas';

const SLOT_SETTINGS_TTL_SECONDS = 6 * 60 * 60;
const OPEN_SLOTS_TTL_SECONDS = 30;

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

export const deleteOpenSlot = command(v.object({ id: v.number() }), async ({ id }) => {
	const session = requireSession();
	const client = createFortyTwoClient(session.accessToken);
	(await client.slots.remove(id)).match(
		() => undefined,
		(apiError) => throwApiError(apiError)
	);
	return refreshOpenSlots(client, session.userId);
});

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
