import type { ResultAsync } from 'neverthrow';
import type { Request42 } from '../client/request';
import type { FortyTwoError } from '../errors';
import { projectSchema, type Project } from '../schemas';

export function projects(request: Request42) {
	return {
		get(id: number): ResultAsync<Project, FortyTwoError> {
			return request({ path: `/projects/${id}`, schema: projectSchema });
		}
	};
}
