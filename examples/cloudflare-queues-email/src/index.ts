/**
 * This is an example of how to use Cueue with Cloudflare Queues to
 * analyze and reply to emails with Cloudflare AI.
 */

import type { MessageBatch } from "@cloudflare/workers-types";
import { CloudflareCueue } from "@cueue/cloudflare-queues";
import type { Context } from "@cueue/core";
import debug from "debug";
import { analyze } from "./analyze";
import { parse } from "./parse";
import { send } from "./send";
import type { Env } from "./types";
import { stream2buffer } from "./utils";

debug.enable("cueue");

function build(env: Env): CloudflareCueue {
	return new CloudflareCueue()
		.use("cueue-email-parse-queue", env.parse, parse(env))
		.use("cueue-email-analyze-queue", env.analyze, analyze(env))
		.use("cueue-email-send-queue", env.send, send(env));
}

export default {
	async queue(batch: MessageBatch<Context>, env: Env): Promise<void> {
		await build(env).take(batch);
	},
	async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
		if (message.rawSize > 100 * 1024) {
			if (!env.r2) {
				message.setReject("Message too large, the limit is 100KB");
				return;
			} else {
				console.log("R2 enabled");
				const buffer = await stream2buffer(message.raw, message.rawSize);
				const filename = message.from + "/" + Date.now() + ".eml";
				await env.r2.put(filename, buffer);
				await build(env).begin({ filename });
			}
		} else {
			const buffer = await stream2buffer(message.raw, message.rawSize);
			await build(env).begin({ buffer });
		}
	},
};
