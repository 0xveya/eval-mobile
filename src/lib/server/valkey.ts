import { createClient } from 'redis';
import { config } from './env';

const client = createClient({
	url: config.valkeyUrl()
});

client.on('error', (cause) => {
	console.error('Valkey error', cause);
});

let connection: Promise<typeof client> | undefined;

export function getValkey(): Promise<typeof client> {
	if (!connection) {
		connection = client.connect().then(() => client);
	}

	return connection;
}
