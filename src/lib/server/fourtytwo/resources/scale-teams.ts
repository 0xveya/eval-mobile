import type { Request42 } from '../client/request';
import type { ResultAsync } from 'neverthrow';
import type { FortyTwoError } from '../errors';
import { scaleTeamsSchema, type ScaleTeam } from '../schemas';

export function scaleTeams(request: Request42) {
	return {
		mine(): ResultAsync<ScaleTeam[], FortyTwoError> {
			return request({
				path: '/me/scale_teams',
				query: {
					'filter[future]': true,
					'page[size]': 100,
					sort: 'begin_at'
				},
				schema: scaleTeamsSchema
			});
		},
		book() {
			throw new Error('Not implemented');
		}
	};
}
