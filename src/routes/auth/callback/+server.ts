import { env } from '$env/dynamic/private';
import { getValkey } from '$lib/server/valkey';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from '../../callback/$types';

type TokenResponse = {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token?: string;
	scope?: string;
	created_at?: number;
};

type MeResponse = {
	id: number;
	login: string;
};

type OAuthState = {
	returnTo: string;
};

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
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

	let oauthState: OAuthState;

	try {
		oauthState = JSON.parse(stateValue) as OAuthState;
	} catch {
		error(400, 'Stored OAuth state is invalid');
	}

	const tokenResponse = await fetch('https://api.intra.42.fr/oauth/token', {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: env.FORTYTWO_CLIENT_ID,
			client_secret: env.FORTYTWO_CLIENT_SECRET,
			code,
			redirect_uri: env.FORTYTWO_REDIRECT_URI
		})
	});

	if (!tokenResponse.ok) {
		const body = await tokenResponse.text();
		console.error('42 token exchange failed', body);
		error(502, 'Could not complete 42 login');
	}

	const token = (await tokenResponse.json()) as TokenResponse;

	const meResponse = await fetch('https://api.intra.42.fr/v2/me', {
		headers: {
			authorization: `Bearer ${token.access_token}`,
			accept: 'application/json'
		}
	});

	if (!meResponse.ok) {
		console.error('42 /me request failed', await meResponse.text());
		error(502, 'Could not retrieve your 42 profile');
	}

	const me = (await meResponse.json()) as MeResponse;

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
		{
			EX: token.expires_in
		}
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

function safeReturnPath(path: string): string {
	return path.startsWith('/') && !path.startsWith('//') ? path : '/app';
}
