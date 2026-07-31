import { getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';

import { throwApiError } from '$lib/utils/utils';
import { createFortyTwoClient } from '$lib/server/fourtytwo/client';
export const getOpenSlots = query(async () => {
	const { locals } = getRequestEvent();

	if (!locals.session) {
		error(401, 'Not signed in');
	}

	const client = createFortyTwoClient(locals.session.accessToken);
	const result = await client.slots.mine();

	return result.match(
		(slots) =>
			slots.filter(
				(slot) => slot.scale_team === null && new Date(slot.end_at).getTime() > Date.now()
			),
		(apiError) => throwApiError(apiError)
	);
});
