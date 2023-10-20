import type { Middleware } from "@cueue/core";
import { z } from "zod";
import type { Env } from "./types";

export function crawler(env: Env): Middleware<{ url: string }> {
	return {
		schema: z.object({
			url: z.string().url(),
		}),
		async exec(ctx, next) {
			const html = await fetch(ctx.url).then((res) => res.text());

			const images = html
				.match(/<img[^>]+src="([^">]+)"/g)
				?.map((img) => {
					return img.match(/src="([^">]+)"/)?.[1];
				})
				.map((img) => {
					if (!img) {
						return undefined;
					}

					try {
						return new URL(img, ctx.url).href;
					} catch {
						return undefined;
					}
				})
				.filter((img): img is string => img !== undefined && img.startsWith("http"));

			if (!images) {
				return;
			}

			if (images.length === 0) {
				return;
			}

			const outs = images.map((image) => ({ image }));
			console.log(outs);
			await next(...outs);
		},
	};
}
