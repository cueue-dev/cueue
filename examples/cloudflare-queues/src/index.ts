/**
 * This is an example of how to use Cueue with Cloudflare Queues to
 * download images from a URL and save them to R2.
 */

import { CloudflareCueue } from "@cueue/cloudflare-queues";
import debug from "debug";
import { crawler } from "./crawler";
import { discord } from "./discord";
import { saver } from "./saver";
import type { Env } from "./types";

debug.enable("cueue");

function build(env: Env): CloudflareCueue {
	return new CloudflareCueue()
		.use("cueue-crawl-queue", env.crawl, crawler(env))
		.use("cueue-save-queue", env.save, saver(env))
		.use("cueue-notify-queue", env.notify, discord(env));
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		const search = new URL(req.url).searchParams;
		const url = search.get("url");
		if (!url) {
			return new Response("Missing URL", { status: 400 });
		}

		try {
			new URL(url);
		} catch {
			return new Response("Invalid URL", { status: 400 });
		}

		await build(env).begin({ url });
		return new Response("OK");
	},
	async queue(batch: MessageBatch<Error>, env: Env): Promise<void> {
		await build(env).take(batch);
	},
};
