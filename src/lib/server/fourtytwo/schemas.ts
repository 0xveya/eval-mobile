import * as v from 'valibot';

export const tokenSchema = v.object({
	access_token: v.string(),
	token_type: v.string(),
	expires_in: v.number(),
	refresh_token: v.optional(v.string()),
	scope: v.optional(v.string()),
	created_at: v.optional(v.number())
});

export type Token = v.InferOutput<typeof tokenSchema>;

export const meSchema = v.object({
	id: v.number(),
	login: v.string()
});

export type Me = v.InferOutput<typeof meSchema>;

const teamUserSchema = v.looseObject({
	id: v.number(),
	login: v.string(),
	url: v.string(),
	leader: v.boolean(),
	occurrence: v.number(),
	validated: v.nullable(v.boolean()),
	projects_user_id: v.number()
});

export const teamSchema = v.looseObject({
	id: v.number(),
	name: v.string(),
	url: v.string(),
	final_mark: v.nullable(v.number()),
	project_id: v.number(),
	created_at: v.string(),
	updated_at: v.string(),
	status: v.string(),
	terminating_at: v.nullable(v.string()),
	users: v.array(teamUserSchema),
	'locked?': v.boolean(),
	'validated?': v.nullable(v.boolean()),
	'closed?': v.boolean(),
	repo_url: v.nullable(v.string()),
	repo_uuid: v.nullable(v.string()),
	locked_at: v.nullable(v.string()),
	closed_at: v.nullable(v.string()),
	project_session_id: v.number(),
	scale_teams: v.array(v.unknown()),
	teams_uploads: v.array(v.unknown())
});

export const teamsSchema = v.array(teamSchema);

export type Team = v.InferOutput<typeof teamSchema>;
