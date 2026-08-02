import type { ResultAsync } from 'neverthrow';
import { campusSchema, type Campus } from '../schemas';
import type { FortyTwoError } from '../errors';
import type { Request42 } from '../client/request';

export function campuses(request: Request42) {
	return {
		get(id: number): ResultAsync<Campus, FortyTwoError> {
			return request({ path: `/campus/${id}`, schema: campusSchema });
		}
	};
}
