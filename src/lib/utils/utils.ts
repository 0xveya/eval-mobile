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

			return error(502, describeApiError(apiError));

		case 'invalid-response':
			console.error(apiError.issues);
			return error(502, '42 returned an unexpected response');
	}
}

export function describeApiError(apiError: FortyTwoError): string {
	switch (apiError.type) {
		case 'network':
			return 'Could not reach the 42 API';
		case 'http':
			return `42 API returned ${apiError.status}${apiErrorDetail(apiError.body)}`;
		case 'invalid-response':
			return '42 returned an unexpected response';
	}
}

function apiErrorDetail(body: unknown): string {
	if (typeof body === 'string' && body.trim()) return `: ${body.trim()}`;
	if (!body || typeof body !== 'object') return '';

	for (const key of ['message', 'error', 'detail'] as const) {
		const value = (body as Record<string, unknown>)[key];
		if (typeof value === 'string' && value.trim()) return `: ${value.trim()}`;
		if (Array.isArray(value)) {
			const messages = value.filter((item): item is string => typeof item === 'string');
			if (messages.length) return `: ${messages.join(', ')}`;
		}
	}
	return '';
}
