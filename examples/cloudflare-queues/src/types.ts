export interface Env {
	crawl: Queue<{ url: string }>;
	save: Queue<{ image: string }>;
	notify: Queue<{ webhook: string; message: string; filename: string }>;
	r2: R2Bucket;
	DISCORD_WEBHOOK: string;
}
