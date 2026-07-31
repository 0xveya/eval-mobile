import { getValkey } from '$lib/server/valkey';
import type { Handle } from '@sveltejs/kit';

type StoredSession = {
	userId: number;
	login: string;
	accessToken: string;
	expiresAt: number;
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.session = null;

	const sessionId = event.cookies.get('session_id');

	if (!sessionId) {
		return resolve(event);
	}

	const valkey = await getValkey();
	const raw = await valkey.get(`session:${sessionId}`);

	if (!raw) {
		event.cookies.delete('session_id', { path: '/' });
		return resolve(event);
	}

	try {
		const stored = JSON.parse(raw) as StoredSession;

		if (stored.expiresAt <= Date.now()) {
			await valkey.del(`session:${sessionId}`);
			event.cookies.delete('session_id', { path: '/' });
			return resolve(event);
		}

		event.locals.session = {
			id: sessionId,
			...stored
		};
	} catch {
		await valkey.del(`session:${sessionId}`);
		event.cookies.delete('session_id', { path: '/' });
	}

	return resolve(event);
};
