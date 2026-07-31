import type { ResultAsync } from 'neverthrow';

import type { FortyTwoError } from '../errors';
import { meSchema, type Me } from '../schemas';
import type { Request42 } from '../client/request';

export function users(request: Request42) {
	return {
		me(): ResultAsync<Me, FortyTwoError> {
			return request({ path: '/me', schema: meSchema });
		}
	};
}
