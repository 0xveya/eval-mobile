import { env } from '$env/dynamic/private';
import { getValkey } from '$lib/server/valkey';
import { exchangeCode } from '$lib/server/fourtytwo/oauth';
import { createFortyTwoClient } from '$lib/server/fourtytwo/client';
import { error, redirect } from '@sveltejs/kit';

import type { FortyTwoError } from '$lib/server/fourtytwo/errors';
import type { RequestHandler } from './$types';

type OAuthState = {
	returnTo: string;
};

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (!code || !state) {
		error(400, 'Missing OAuth code or state');
	}

	const valkey = await getValkey();
	const stateValue = await valkey.getDel(`oauth-state:${state}`);

	if (!stateValue) {
		error(400, 'OAuth state is invalid or expired');
	}

	const oauthState = parseOAuthState(stateValue);

	const tokenResult = await exchangeCode({
		clientId: env.FORTYTWO_CLIENT_ID,
		clientSecret: env.FORTYTWO_CLIENT_SECRET,
		redirectUri: env.FORTYTWO_REDIRECT_URI,
		code
	});

	const token = tokenResult.match(
		(value) => value,
		(apiError) => throwOAuthError(apiError)
	);

	const client = createFortyTwoClient(token.access_token);
	const meResult = await client.users.me();

	const me = meResult.match(
		(value) => value,
		(apiError) => throwOAuthError(apiError)
	);

	const sessionId = crypto.randomUUID();
	const expiresAt = Date.now() + token.expires_in * 1000;

	await valkey.set(
		`session:${sessionId}`,
		JSON.stringify({
			userId: me.id,
			login: me.login,
			accessToken: token.access_token,
			expiresAt
		}),
		{ EX: token.expires_in }
	);

	cookies.set('session_id', sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !import.meta.env.DEV,
		maxAge: token.expires_in
	});

	redirect(303, safeReturnPath(oauthState.returnTo));
};

function parseOAuthState(value: string): OAuthState {
	try {
		const parsed = JSON.parse(value) as unknown;

		if (
			typeof parsed !== 'object' ||
			parsed === null ||
			!('returnTo' in parsed) ||
			typeof parsed.returnTo !== 'string'
		) {
			error(400, 'Stored OAuth state is invalid');
		}

		return { returnTo: parsed.returnTo };
	} catch {
		error(400, 'Stored OAuth state is invalid');
	}
}

function throwOAuthError(apiError: FortyTwoError): never {
	switch (apiError.type) {
		case 'network':
			console.error('42 network error', apiError.cause);
			return error(502, 'Could not reach 42');
		case 'http':
			console.error('42 HTTP error', apiError.status, apiError.body);
			return error(502, '42 rejected the OAuth request');
		case 'invalid-response':
			console.error('Invalid 42 response', apiError.issues);
			return error(502, '42 returned an invalid response');
	}
}

function safeReturnPath(path: string): string {
	return path.startsWith('/') && !path.startsWith('//') ? path : '/app';
}
