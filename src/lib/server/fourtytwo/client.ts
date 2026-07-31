import { err, ok, ResultAsync } from 'neverthrow';
import * as v from 'valibot';

import { meSchema, type Me } from './schemas';
import type { FortyTwoError } from './errors';

const API_BASE = 'https://api.intra.42.fr/v2';

export class FortyTwoClient {
	constructor(private readonly accessToken: string) {}

	getMe(): ResultAsync<Me, FortyTwoError> {
		return ResultAsync.fromPromise(
			fetch(`${API_BASE}/me`, {
				headers: {
					accept: 'application/json',
					authorization: `Bearer ${this.accessToken}`
				}
			}),
			(cause): FortyTwoError => ({
				type: 'network',
				cause
			})
		).andThen((response) =>
			ResultAsync.fromPromise(readJson(response), (cause): FortyTwoError => ({
				type: 'network',
				cause
			})).andThen((body) => {
				if (!response.ok) {
					return err<never, FortyTwoError>({
						type: 'http',
						status: response.status,
						body
					});
				}

				const parsed = v.safeParse(meSchema, body);

				if (!parsed.success) {
					return err<never, FortyTwoError>({
						type: 'invalid-response',
						issues: parsed.issues
					});
				}

				return ok<Me, FortyTwoError>(parsed.output);
			})
		);
	}
}

async function readJson(response: Response): Promise<unknown> {
	const text = await response.text();

	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}
