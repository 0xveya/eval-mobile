import { env as privateEnv } from '$env/dynamic/private';

function required(name: string): string {
	const value = privateEnv[name];

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

export const config = {
	valkeyUrl: () => privateEnv.VALKEY_URL ?? 'redis://127.0.0.1:6379',
	fortyTwoClientId: () => required('FORTYTWO_CLIENT_ID'),
	fortyTwoClientSecret: () => required('FORTYTWO_CLIENT_SECRET'),
	fortyTwoRedirectUri: () => required('FORTYTWO_REDIRECT_URI'),
	sessionSecret: () => required('SESSION_SECRET')
} as const;
