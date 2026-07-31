import { env } from '$env/dynamic/private';
import { getValkey } from '$lib/server/valkey';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const valkey = await getValkey();
	const state = crypto.randomUUID();

	await valkey.set(
		`oauth-state:${state}`,
		JSON.stringify({
			returnTo: url.searchParams.get('returnTo') ?? '/app'
		}),
		{
			EX: 10 * 60
		}
	);

	const authorizationUrl = new URL('https://api.intra.42.fr/oauth/authorize');

	authorizationUrl.searchParams.set('client_id', env.FORTYTWO_CLIENT_ID);
	authorizationUrl.searchParams.set('redirect_uri', env.FORTYTWO_REDIRECT_URI);
	authorizationUrl.searchParams.set('response_type', 'code');
	authorizationUrl.searchParams.set('scope', 'public');
	authorizationUrl.searchParams.set('state', state);

	redirect(303, authorizationUrl.toString());
};
