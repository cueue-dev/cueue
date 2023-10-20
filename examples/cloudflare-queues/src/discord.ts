import type { Middleware } from "@cueue/core";
import { z } from "zod";
import type { Env } from "./types";

export function discord(
	env: Env,
): Middleware<{ webhook: string; message: string; filename: string }> {
	return {
		schema: z.object({
			webhook: z.string(),
			message: z.string(),
			filename: z.string(),
		}),
		async exec(ctx, next) {
			const file = await env.r2.get(ctx.filename);
			if (!file) {
				throw new Error("File not found");
			}

			const body = new FormData();
			body.append("files[0]", await file.blob(), "image.png");
			body.append(
				"payload_json",
				JSON.stringify({
					content: ctx.message,
				}),
			);

			const res = await fetch(ctx.webhook, {
				method: "POST",
				body,
			});

			if (!res.ok) {
				throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
			} else {
				console.log("Sent message to Discord");
			}
		},
	};
}
