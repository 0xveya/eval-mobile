import { err, ok, ResultAsync } from 'neverthrow';
import * as v from 'valibot';

import { tokenSchema, type Token } from './schemas';
import type { FortyTwoError } from './errors';

type ExchangeCodeInput = {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	code: string;
};

export function exchangeCode(input: ExchangeCodeInput): ResultAsync<Token, FortyTwoError> {
	return ResultAsync.fromPromise(
		fetch('https://api.intra.42.fr/oauth/token', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				client_id: input.clientId,
				client_secret: input.clientSecret,
				redirect_uri: input.redirectUri,
				code: input.code
			})
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

			const parsed = v.safeParse(tokenSchema, body);

			if (!parsed.success) {
				return err<never, FortyTwoError>({
					type: 'invalid-response',
					issues: parsed.issues
				});
			}

			return ok<Token, FortyTwoError>(parsed.output);
		})
	);
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
