import { getValkey } from '$lib/server/valkey';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get('session_id');

	if (sessionId) {
		const valkey = await getValkey();
		await valkey.del(`session:${sessionId}`);
	}

	cookies.delete('session_id', {
		path: '/'
	});

	redirect(303, '/');
};
