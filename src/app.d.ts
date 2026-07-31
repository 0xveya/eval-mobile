declare global {
	namespace App {
		interface Locals {
			session: Session | null;
		}
	}
}

export type Session = {
	id: string;
	userId: number;
	login: string;
	accessToken: string;
	expiresAt: number;
};

export {};
