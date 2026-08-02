import type { ResultAsync } from 'neverthrow';
import * as v from 'valibot';
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
		create(input: {
			userId: number;
			beginAt: string;
			endAt: string;
		}): ResultAsync<unknown, FortyTwoError> {
			return request({
				method: 'POST',
				path: '/slots',
				body: {
					slot: {
						user_id: input.userId,
						begin_at: input.beginAt,
						end_at: input.endAt
					}
				},
				schema: v.unknown()
			});
		},
		update(
			id: number,
			input: { userId: number; beginAt: string; endAt: string }
		): ResultAsync<unknown, FortyTwoError> {
			return request({
				method: 'PATCH',
				path: `/slots/${id}`,
				body: {
					slot: {
						user_id: input.userId,
						begin_at: input.beginAt,
						end_at: input.endAt
					}
				},
				schema: v.unknown()
			});
		},
		remove(id: number): ResultAsync<null, FortyTwoError> {
			return request({ method: 'DELETE', path: `/slots/${id}`, schema: v.null() });
		}
	};
}
