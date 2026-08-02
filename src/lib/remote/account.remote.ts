import { getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';

import { createFortyTwoClient } from '$lib/server/fourtytwo/client';
import { throwApiError } from '$lib/utils/utils';
import type { Team } from '$lib/server/fourtytwo/schemas';
import { cachedJson } from '$lib/server/cache';

type FortyTwoClient = ReturnType<typeof createFortyTwoClient>;
const USER_TTL_SECONDS = 15 * 60;
const BOOKABLE_TEAMS_TTL_SECONDS = 2 * 60;

export const getCurrentUser = query(async () => {
	const { locals } = getRequestEvent();
	const session = locals.session;
	if (!session) {
		error(401, 'Not signed in');
	}

	return cachedJson(`user:${session.userId}:me`, USER_TTL_SECONDS, async () => {
		const client = createFortyTwoClient(session.accessToken);
		const result = await client.users.me();
		return result.match(
			(user) => user,
			(apiError) => throwApiError(apiError)
		);
	});
});

export const getBookableTeams = query(async () => {
	const { locals } = getRequestEvent();
	const session = locals.session;
	if (!session) {
		error(401, 'Not signed in');
	}

	return cachedJson(
		`user:${session.userId}:bookable-teams`,
		BOOKABLE_TEAMS_TTL_SECONDS,
		async () => {
			const client = createFortyTwoClient(session.accessToken);
			const teams = await getAllCurrentUserTeams(client);
			return teams.filter(isOpen).filter(isSubmitted).filter(isUnlocked).filter(isNotValidated);
		}
	);
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
