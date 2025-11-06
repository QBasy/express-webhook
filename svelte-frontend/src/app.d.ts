import type { UserPublic } from '$types';

declare global {
	namespace App {
		interface Locals {
			user?: UserPublic;
			token?: string;
		}
		
		interface PageData {
			user?: UserPublic;
		}
	}
}

export {};
