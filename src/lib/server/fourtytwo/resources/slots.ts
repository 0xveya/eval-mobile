import type { ResultAsync } from 'neverthrow';
import type { Request42 } from '../client/request';
import type { FortyTwoError } from '../errors';
import { slotsSchema, type Slots } from '../schemas';

export function slots(request: Request42) {
	return {
		mine(): ResultAsync<Slots, FortyTwoError> {
			return request({
				path: '/me/slots',
				query: {
					'filter[future]': true,
					'page[size]': 100,
					sort: 'begin_at'
				},
				schema: slotsSchema
			});
		},
		create() {
			throw new Error('Not implemented');
		},
		delete() {
			throw new Error('Not implemented');
		}
	};
}
