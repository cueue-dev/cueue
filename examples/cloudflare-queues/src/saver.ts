import type { Consumer } from "@cueue/core";
import { z } from "zod";
import type { Env } from "./types";

export function saver(env: Env): Consumer<{ image: string }> {
	return {
		schema: z.object({
			image: z.string().url(),
		}),
		async exec(ctx, next) {
			const url = new URL(ctx.image);
			const filename = url.hostname + url.pathname;
			const res = await fetch(ctx.image);
			const buffer = await res.arrayBuffer();
			await env.r2.put(filename, buffer);
			console.log(`Saved ${filename}`);

			const ret = {
				webhook: env.DISCORD_WEBHOOK,
				message: `Saved \`${url.href}\``,
				filename: filename,
			};
			console.log(ret);
			await next(ret);
		},
	};
}
