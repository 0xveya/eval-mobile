import { createRequest } from './request';
import { scaleTeams } from '../resources/scale-teams';
import { slots } from '../resources/slots';
import { users } from '../resources/users';
import { teams } from '../resources/teams';
import { campuses } from '../resources/campus';
import { projects } from '../resources/projects';

export function createFortyTwoClient(accessToken: string) {
	const request = createRequest(accessToken);

	return {
		users: users(request),
		teams: teams(request),
		campuses: campuses(request),
		projects: projects(request),
		slots: slots(request),
		scaleTeams: scaleTeams(request)
	};
}
