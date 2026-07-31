import type { ResultAsync } from 'neverthrow';

import type { Request42 } from '../client/request';
import type { FortyTwoError } from '../errors';
import { teamsSchema, type Team } from '../schemas';

export type TeamsPage = {
	page?: number;
	size?: number;
};

export function teams(request: Request42) {
	return {
		mine({ page = 1, size = 30 }: TeamsPage = {}): ResultAsync<Team[], FortyTwoError> {
			return request({
				path: '/me/teams',
				query: { 'page[number]': page, 'page[size]': size },
				schema: teamsSchema
			});
		}
	};
}
