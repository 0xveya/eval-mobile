import { getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';

import { createFortyTwoClient } from '$lib/server/fourtytwo/client';
import { throwApiError } from '$lib/utils/utils';
import type { ScaleTeam, Team } from '$lib/server/fourtytwo/schemas';
import { cachedJson } from '$lib/server/cache';

type FortyTwoClient = ReturnType<typeof createFortyTwoClient>;
const USER_TTL_SECONDS = 15 * 60;
const BOOKABLE_TEAMS_TTL_SECONDS = 2 * 60;
const UPCOMING_EVALUATIONS_TTL_SECONDS = 30;

export type UpcomingEvaluation = {
	id: string;
	project: string;
	projectId?: number;
	projectSlug?: string;
	person: string;
	direction: 'outgoing' | 'incoming';
	beginAt: string;
};

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

export const getUpcomingEvaluations = query(async (): Promise<UpcomingEvaluation[]> => {
	const { locals } = getRequestEvent();
	const session = locals.session;
	if (!session) error(401, 'Not signed in');

	return cachedJson(
		`user:${session.userId}:upcoming-evaluations`,
		UPCOMING_EVALUATIONS_TTL_SECONDS,
		async () => {
			const client = createFortyTwoClient(session.accessToken);
			const result = await client.scaleTeams.mine();
			const scaleTeams = result.match(
				(value) => value,
				(apiError) => throwApiError(apiError)
			);
			const projects = new Map<number, { name: string; slug: string }>();
			await Promise.all(
				[...new Set(scaleTeams.flatMap((scaleTeam) => scaleTeam.team?.project_id ?? []))].map(
					async (projectId) => {
						const project = await client.projects.get(projectId);
						if (project.isOk()) projects.set(projectId, project.value);
					}
				)
			);
			return scaleTeams.map((scaleTeam) =>
				toUpcomingEvaluation(scaleTeam, session.userId, projects)
			);
		}
	);
});

function toUpcomingEvaluation(
	scaleTeam: ScaleTeam,
	currentUserId: number,
	projects: Map<number, { name: string; slug: string }>
): UpcomingEvaluation {
	const outgoing = scaleTeam.corrector?.id === currentUserId;
	const otherUsers = outgoing
		? Array.isArray(scaleTeam.correcteds)
			? scaleTeam.correcteds
			: []
		: scaleTeam.corrector
			? [scaleTeam.corrector]
			: [];
	const projectId = scaleTeam.team?.project_id;
	const project = projectId === undefined ? undefined : projects.get(projectId);
	return {
		id: String(scaleTeam.id),
		project: project?.name ?? scaleTeam.scale?.name ?? 'Booked evaluation',
		projectId,
		projectSlug: project?.slug,
		person:
			otherUsers.map((user) => user.login).join(', ') ||
			(outgoing ? 'Hidden by 42 until evaluation' : 'Evaluator pending'),
		direction: outgoing ? 'outgoing' : 'incoming',
		beginAt: scaleTeam.begin_at
	};
}

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
