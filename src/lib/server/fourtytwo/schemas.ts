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
