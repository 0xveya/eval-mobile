import { getValkey } from './valkey';

const CACHE_VERSION = 'v1';

export async function cachedJson<T>(
	key: string,
	ttlSeconds: number,
	load: () => Promise<T>
): Promise<T> {
	const valkey = await getValkey();
	const versionedKey = `cache:${CACHE_VERSION}:${key}`;
	const cached = await valkey.get(versionedKey);

	if (cached !== null) {
		try {
			return JSON.parse(cached) as T;
		} catch {
			await valkey.del(versionedKey);
		}
	}

	const value = await load();
	await valkey.set(versionedKey, JSON.stringify(value), { EX: ttlSeconds });
	return value;
}
