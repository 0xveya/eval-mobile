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
	login: v.string(),
	campus_users: v.optional(
		v.array(
			v.looseObject({
				campus_id: v.number(),
				is_primary: v.boolean()
			})
		),
		[]
	)
});

export type Me = v.InferOutput<typeof meSchema>;

export const campusSchema = v.looseObject({
	id: v.number(),
	name: v.string(),
	minimum_slot_duration: v.optional(v.nullable(v.number()), 30)
});

export type Campus = v.InferOutput<typeof campusSchema>;

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

export const slotSchema = v.looseObject({
	id: v.number(),
	begin_at: v.string(),
	end_at: v.string(),
	scale_team: v.nullable(v.unknown()),
	user: v.looseObject({
		id: v.number(),
		login: v.string()
	})
});

export const slotsSchema = v.array(slotSchema);

export type Slot = v.InferOutput<typeof slotSchema>;
export type Slots = v.InferOutput<typeof slotsSchema>;
