import { getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';

import { createFortyTwoClient } from '$lib/server/fourtytwo/client';
import { throwApiError } from '$lib/utils/utils';
import type { Team } from '$lib/server/fourtytwo/schemas';

type FortyTwoClient = ReturnType<typeof createFortyTwoClient>;

export const getCurrentUser = query(async () => {
	const { locals } = getRequestEvent();

	if (!locals.session) {
		error(401, 'Not signed in');
	}

	const client = createFortyTwoClient(locals.session.accessToken);
	const result = await client.users.me();

	return result.match(
		(user) => user,
		(apiError) => throwApiError(apiError)
	);
});

export const getBookableTeams = query(async () => {
	const { locals } = getRequestEvent();

	if (!locals.session) {
		error(401, 'Not signed in');
	}

	const client = createFortyTwoClient(locals.session.accessToken);
	const teams = await getAllCurrentUserTeams(client);

	return teams.filter(isOpen).filter(isSubmitted).filter(isUnlocked).filter(isNotValidated);
});

async function getAllCurrentUserTeams(client: FortyTwoClient): Promise<Team[]> {
	const allTeams: Team[] = [];
	const pageSize = 100;

	for (let page = 1; ; page += 1) {
		const result = await client.teams.mine({ page, size: pageSize });
		const pageOfTeams = result.match(
			(value) => value,
			(apiError) => throwApiError(apiError)
		);

		allTeams.push(...pageOfTeams);
		if (pageOfTeams.length < pageSize) return allTeams;
	}
}

function isOpen(team: Team): boolean {
	return !team['closed?'];
}

function isSubmitted(team: Team): boolean {
	return team.status === 'waiting_for_correction';
}

function isUnlocked(team: Team): boolean {
	return !team['locked?'];
}

function isNotValidated(team: Team): boolean {
	return team['validated?'] !== true;
}
