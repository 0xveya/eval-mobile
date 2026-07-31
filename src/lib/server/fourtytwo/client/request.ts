import { err, ok, ResultAsync } from 'neverthrow';
import * as v from 'valibot';

import type { FortyTwoError } from '../errors';

const API_BASE = 'https://api.intra.42.fr/v2';

type RequestOptions<TSchema extends v.GenericSchema> = {
	method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
	path: string;
	query?: Record<string, string | number | boolean | undefined>;
	body?: unknown;
	schema: TSchema;
};

export type Request42 = <TSchema extends v.GenericSchema>(
	options: RequestOptions<TSchema>
) => ResultAsync<v.InferOutput<TSchema>, FortyTwoError>;

export function createRequest(accessToken: string): Request42 {
	return <TSchema extends v.GenericSchema>({
		method = 'GET',
		path,
		query,
		body,
		schema
	}: RequestOptions<TSchema>) =>
		ResultAsync.fromPromise(
			fetch(buildUrl(path, query), {
				method,
				headers: {
					accept: 'application/json',
					authorization: `Bearer ${accessToken}`,
					...(body === undefined ? {} : { 'content-type': 'application/json' })
				},
				...(body === undefined ? {} : { body: JSON.stringify(body) })
			}),
			(cause): FortyTwoError => ({ type: 'network', cause })
		).andThen((response) =>
			ResultAsync.fromPromise(readJson(response), (cause): FortyTwoError => ({
				type: 'network',
				cause
			})).andThen((responseBody) => {
				if (!response.ok) {
					return err<never, FortyTwoError>({
						type: 'http',
						status: response.status,
						body: responseBody
					});
				}

				const parsed = v.safeParse(schema, responseBody);

				if (!parsed.success) {
					return err<never, FortyTwoError>({
						type: 'invalid-response',
						issues: parsed.issues
					});
				}

				return ok<v.InferOutput<TSchema>, FortyTwoError>(parsed.output);
			})
		);
}

function buildUrl(
	path: string,
	query: Record<string, string | number | boolean | undefined> | undefined
): string {
	const url = new URL(`${API_BASE}${path}`);

	for (const [key, value] of Object.entries(query ?? {})) {
		if (value !== undefined) url.searchParams.set(key, String(value));
	}

	return url.toString();
}

async function readJson(response: Response): Promise<unknown> {
	const text = await response.text();

	if (!text) return null;

	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}
