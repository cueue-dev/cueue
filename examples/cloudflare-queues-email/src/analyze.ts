import { Ai } from "@cloudflare/ai";
import type { Consumer } from "@cueue/core";
import { z } from "zod";
import type { Env } from "./types";

export function analyze(env: Env): Consumer<{
	whoami: string;
	address: string;
	title: string;
	content: string;
	image?: ArrayBuffer;
	image_filename?: string;
	audio?: ArrayBuffer;
	audio_filename?: string;
}> {
	return {
		schema: z.object({
			whoami: z.string(),
			address: z.string(),
			title: z.string(),
			content: z.string(),
			image: z.optional(z.instanceof(ArrayBuffer)),
			image_filename: z.optional(z.string()),
			audio: z.optional(z.instanceof(ArrayBuffer)),
			audio_filename: z.optional(z.string()),
		}),
		async exec(ctx, next) {
			const image =
				env.r2 && ctx.image_filename
					? await env.r2.get(ctx.image_filename).then((body) => body?.arrayBuffer())
					: ctx.image;
			const audio =
				env.r2 && ctx.audio_filename
					? await env.r2.get(ctx.audio_filename).then((body) => body?.arrayBuffer())
					: ctx.audio;

			const ai = new Ai(env.AI);

			const reply: Parameters<Env["send"]["send"]>[0] = {
				as: ctx.whoami,
				target: ctx.address,
				title: ctx.title.toLowerCase().startsWith("re:") ? ctx.title : `Re: ${ctx.title}`,
				content: "Unkown.",
			};

			if (image) {
				const inputs = {
					image: [...new Uint8Array(image)],
				};

				const results: { label: string; score: number }[] = await ai.run(
					"@cf/microsoft/resnet-50",
					inputs,
				);

				let content = "Result of image analysis:\n";
				for (const result of results) {
					content += `${result.label}: ${(result.score * 100).toFixed(1)}%\n`;
				}

				const messages = [
					{
						role: "system",
						content:
							"You are a friendly assistant that can do image analysis, ASR and QA. Reply with the image analysis result.",
					},
					{ role: "user", content: content },
				];

				const result: { response: string } = await ai.run("@cf/meta/llama-2-7b-chat-int8", {
					messages,
				});

				reply.content = result.response;
			} else if (audio) {
				const input = {
					audio: [...new Uint8Array(audio)],
				};

				const transcript: { text: string } = await ai.run("@cf/openai/whisper", input);

				const messages = [
					{
						role: "system",
						content:
							"You are a friendly assistant that can do image analysis, ASR and QA. Reply with the ASR result.",
					},
					{ role: "user", content: `Result of ASR:\n\n${transcript.text}` },
				];

				const result: { response: string } = await ai.run("@cf/meta/llama-2-7b-chat-int8", {
					messages,
				});

				reply.content = result.response;
			} else {
				// const task = await determine_task(ctx.content, ai);
				// console.log(task);
				// if ("qa" in task) {
				const messages = [
					{
						role: "system",
						content:
							"You are a friendly assistant that can do image analysis, ASR and QA.",
					},
					{ role: "user", content: ctx.content },
				];
				const result: { response: string } = await ai.run("@cf/meta/llama-2-7b-chat-int8", {
					messages,
				});

				reply.content = result.response;
				// } else if ("translate" in task) {
				// 	const input = {
				// 		text: task.translate[1],
				// 		target_lang: task.translate[0],
				// 	};

				// 	const translation: { translated_text: string } = await ai.run(
				// 		"@cf/meta/m2m100-1.2b",
				// 		input,
				// 	);

				// 	reply.content = translation.translated_text;
				// }
			}

			console.log(reply);
			await next(reply);
		},
	};
}

async function determine_task(
	message: string,
	ai: Ai,
): Promise<
	| {
			translate: [string, string];
	  }
	| {
			qa: string;
	  }
> {
	const result: { response: string } = await ai.run("@cf/meta/llama-2-7b-chat-int8", {
		messages: [
			{
				role: "system",
				content:
					"Based on the user's message, determine the task to perform. The options are 'translate' and 'qa'.\n" +
					"If the task is 'translate', reply with `translate, <target lang>: <raw message to translate>`.\n" +
					"If the task is 'qa', reply with just `qa`.\n" +
					"Otherwise, reply with `unknown`.\n" +
					"\n" +
					"Supported translate languages: `english`, `chinese`, `french`, `spanish`, `arabic`, `russian`, `german`, `japanese`, `portuguese`, `hindi`",
			},
			{ role: "user", content: message },
		],
	});

	if (result.response.toLowerCase().includes("translat")) {
		const match = result.response.match(/translate, (.+): ([\s\S]+)/i);
		if (match) {
			return { translate: [match[1], match[2]] };
		} else {
			return { qa: message };
		}
	} else {
		return { qa: message };
	}
}
