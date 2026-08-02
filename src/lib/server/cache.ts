import { getValkey } from './valkey';

const CACHE_VERSION = 'v1';

function versionedKey(key: string): string {
	return `cache:${CACHE_VERSION}:${key}`;
}

export async function cachedJson<T>(
	key: string,
	ttlSeconds: number,
	load: () => Promise<T>
): Promise<T> {
	const valkey = await getValkey();
	const cacheKey = versionedKey(key);
	const cached = await valkey.get(cacheKey);

	if (cached !== null) {
		try {
			return JSON.parse(cached) as T;
		} catch {
			await valkey.del(cacheKey);
		}
	}

	const value = await load();
	await valkey.set(cacheKey, JSON.stringify(value), { EX: ttlSeconds });
	return value;
}

export async function invalidateCachedJson(key: string): Promise<void> {
	const valkey = await getValkey();
	await valkey.del(versionedKey(key));
}
