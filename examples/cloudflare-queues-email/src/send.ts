import type { Consumer } from "@cueue/core";
import { z } from "zod";
import type { Env } from "./types";

export function send(
	env: Env,
): Consumer<{ as: string; target: string; title: string; content: string }> {
	return {
		schema: z.object({
			as: z.string(),
			target: z.string(),
			title: z.string(),
			content: z.string(),
		}),
		async exec(ctx, next) {
			const payload = {
				personalizations: [{ to: [{ email: ctx.target }] }],
				from: {
					name: env.NAME || "Cueue with Cloudflare AI",
					email: ctx.as,
				},
				subject: ctx.title,
				content: [
					{
						type: "text/plain",
						value: ctx.content,
					},
				],
			};

			const req = new Request("https://api.mailchannels.net/tx/v1/send", {
				method: "POST",
				headers: {
					"content-type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const res = await fetch(req);
			if (!res.ok) {
				throw new Error(`Failed to send email: ${res.status} ${await res.text()}`);
			}
		},
	};
}
