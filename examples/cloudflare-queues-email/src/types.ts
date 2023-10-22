import type { Queue, R2Bucket } from "@cloudflare/workers-types";

export interface Env {
	parse: Queue<{ buffer: ArrayBuffer } | { filename: string }>;
	analyze: Queue<{
		whoami: string;
		address: string;
		title: string;
		content: string;
		image?: ArrayBuffer;
		image_filename?: string;
		audio?: ArrayBuffer;
		audio_filename?: string;
	}>;
	send: Queue<{ as: string; target: string; title: string; content: string }>;
	r2?: R2Bucket;
	AI: unknown;
	NAME?: string;
}
