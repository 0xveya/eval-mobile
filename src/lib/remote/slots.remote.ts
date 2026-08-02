import { getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';

import { throwApiError } from '$lib/utils/utils';
import { createFortyTwoClient } from '$lib/server/fourtytwo/client';
import { getValkey } from '$lib/server/valkey';

const SLOT_SETTINGS_TTL_SECONDS = 6 * 60 * 60;
export const getOpenSlots = query(async () => {
	const { locals } = getRequestEvent();

	if (!locals.session) {
		error(401, 'Not signed in');
	}

	const client = createFortyTwoClient(locals.session.accessToken);
	const result = await client.slots.mine();

	return result.match(
		(slots) => slots.filter((slot) => new Date(slot.end_at).getTime() > Date.now()),
		(apiError) => throwApiError(apiError)
	);
});

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
