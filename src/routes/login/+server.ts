import { env } from '$env/dynamic/private';
import { getValkey } from '$lib/server/valkey';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const state = crypto.randomUUID();
	const returnTo = safeReturnPath(url.searchParams.get('returnTo') ?? '/app');
	const valkey = await getValkey();

	await valkey.set(`oauth-state:${state}`, JSON.stringify({ returnTo }), { EX: 600 });

	const authorizeUrl = new URL('https://api.intra.42.fr/oauth/authorize');
	authorizeUrl.search = new URLSearchParams({
		client_id: env.FORTYTWO_CLIENT_ID,
		redirect_uri: env.FORTYTWO_REDIRECT_URI,
		response_type: 'code',
		scope: 'public projects',
		state
	}).toString();

	redirect(303, authorizeUrl.toString());
};

function safeReturnPath(path: string): string {
	return path.startsWith('/') && !path.startsWith('//') ? path : '/app';
}
