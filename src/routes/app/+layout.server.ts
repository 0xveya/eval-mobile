import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.session) {
		const returnTo = `${url.pathname}${url.search}`;

		redirect(303, `/login?returnTo=${encodeURIComponent(returnTo)}`);
	}

	return {
		user: {
			id: locals.session.userId,
			login: locals.session.login
		}
	};
};
