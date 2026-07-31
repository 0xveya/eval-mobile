import { error } from '@sveltejs/kit';

import type { FortyTwoError } from '$lib/server/fourtytwo/errors';

export function throwApiError(apiError: FortyTwoError): never {
	switch (apiError.type) {
		case 'network':
			console.error(apiError.cause);
			return error(502, 'Could not reach the 42 API');

		case 'http':
			console.error(apiError.status, apiError.body);

			if (apiError.status === 401) {
				return error(401, 'Your 42 session has expired');
			}

			if (apiError.status === 403) {
				return error(403, 'Your 42 token does not have permission to access this resource');
			}

			return error(502, `42 API returned ${apiError.status}`);

		case 'invalid-response':
			console.error(apiError.issues);
			return error(502, '42 returned an unexpected response');
	}
}
