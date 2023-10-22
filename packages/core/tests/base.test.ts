import { describe, expect, it } from "vitest";
import { z } from "zod";
import { BaseQueue, Consumer, Cueue, Queue } from "../src";

describe("Cueue with BaseQueue", () => {
	it("should work with BaseQueue", async () => {
		const cueue = new Cueue();

		const queue1: Queue<{ number: number }> = new BaseQueue("queue1", cueue);
		const queue2: Queue<{ doubled: number }> = new BaseQueue("queue2", cueue);
		const queue3: Queue<{ stringified: string }> = new BaseQueue("queue3", cueue);

		const consumer1: Consumer<{ number: number }> = {
			schema: z.object({
				number: z.number(),
			}),
			exec: async (ctx, next) => {
				await next({ doubled: ctx.number * 2 });
			},
		};

		const consumer2: Consumer<{ doubled: number }> = {
			schema: z.object({
				doubled: z.number(),
			}),
			exec: async (ctx, next) => {
				await next({ stringified: ctx.doubled.toString() });
			},
		};

		cueue.use(queue1, consumer1);
		cueue.use(queue2, consumer2);

		const result = new Promise<string>((resolve) => {
			const consumer3: Consumer<{ stringified: string }> = {
				schema: z.object({
					stringified: z.string(),
				}),
				exec: async (ctx, next) => {
					resolve(ctx.stringified);
					await next();
				},
			};

			cueue.use(queue3, consumer3);
		});

		await queue1.send({ number: 2 });
		expect(await result).toBe("4");
	});

	it("should work with random access", async () => {
		const cueue = new Cueue();

		const queue1: Queue<{ number: number }> = new BaseQueue("queue1", cueue);
		const queue2: Queue<{ result: number }> = new BaseQueue("queue2", cueue);

		const consumer1: Consumer<{ number: number }> = {
			schema: z.object({
				number: z.number(),
			}),
			exec: async (ctx, next, forward) => {
				if (ctx.number < 1000) {
					await forward(queue1.name, { number: ctx.number + 1 });
				} else {
					await next({ result: ctx.number });
				}
			},
		};

		cueue.use(queue1, consumer1);

		const result = new Promise<number>((resolve) => {
			const consumer2: Consumer<{ result: number }> = {
				schema: z.object({
					result: z.number(),
				}),
				exec: async (ctx, next) => {
					resolve(ctx.result);
					await next();
				},
			};

			cueue.use(queue2, consumer2);
		});

		await queue1.send({ number: 0 });
		expect(await result).toBe(1000);
	});
});
