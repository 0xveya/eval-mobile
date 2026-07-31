import type { Request42 } from '../client/request';

export function slots(_request: Request42) {
	void _request;

	return {
		mine() {
			throw new Error('Not implemented');
		},
		create() {
			throw new Error('Not implemented');
		},
		delete() {
			throw new Error('Not implemented');
		}
	};
}
