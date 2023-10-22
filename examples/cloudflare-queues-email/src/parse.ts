import type { Consumer } from "@cueue/core";
import PostalMime from "postal-mime";
import { z } from "zod";
import type { Env } from "./types";

export function parse(env: Env): Consumer<{ buffer: ArrayBuffer } | { filename: string }> {
	return {
		schema: z
			.object({
				buffer: z.instanceof(ArrayBuffer),
			})
			.or(
				z.object({
					filename: z.string(),
				}),
			),
		async exec(ctx, next) {
			const parser = new PostalMime();

			const buffer =
				"buffer" in ctx
					? ctx.buffer
					: await env.r2?.get(ctx.filename).then((body) => body?.arrayBuffer());
			if (!buffer) {
				throw new Error("Failed to get email buffer.");
			}

			const parsed = await parser.parse(buffer);

			const result: Parameters<Env["analyze"]["send"]>[0] = {
				whoami: parsed.to[0].address,
				address: parsed.from.address,
				title: parsed.subject || "",
				content: parsed.text?.slice(0, 3000) || "",
			};

			const image = parsed.attachments.find((attachment) =>
				attachment.mimeType.startsWith("image/"),
			);
			if (image) {
				if (env.r2) {
					const filename = `${result.address}/${Date.now()}-${image.filename}`;
					await env.r2.put(filename, image.content as unknown as ArrayBuffer);
					result.image_filename = filename;
				} else {
					result.image = image.content as unknown as ArrayBuffer;
				}
				console.log("found image");
			}

			const audio = parsed.attachments.find((attachment) =>
				attachment.mimeType.startsWith("audio/"),
			);
			if (audio) {
				if (env.r2) {
					const filename = `${result.address}/${Date.now()}-${audio.filename}`;
					await env.r2.put(filename, audio.content as unknown as ArrayBuffer);
					result.audio_filename = filename;
				} else {
					result.audio = audio.content as unknown as ArrayBuffer;
				}
				console.log("found audio");
			}

			await next(result);
		},
	};
}
