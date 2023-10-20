import debug from "debug";
import type { Middleware, Queue, RunOptions } from "./types";

export class Cueue {
	protected queues = new Map<string, Queue>();
	protected middlewares = new Map<string, Middleware<unknown>>();
	protected sequence: string[] = [];
	protected log = debug("cueue");

	/**
	 * Add a middleware.
	 */
	public use<T>(queue: Queue<T>, middleware: Middleware<T>): this {
		const name = queue.name;
		if (this.queues.has(name)) {
			throw new Error(`Queue "${name}" already exists`);
		}

		this.queues.set(name, queue);
		this.middlewares.set(name, middleware as Middleware<unknown>);
		this.sequence.push(name);
		this.log(`Added middleware "${name}"`);
		return this;
	}

	public async run(
		step: string | number,
		context: unknown,
		opt: RunOptions = {},
	): Promise<string | null> {
		const index = typeof step === "string" ? this.sequence.indexOf(step) : step;
		if (index === -1) {
			throw new Error(`Step "${step}" not found`);
		}
		this.log(`Starting at step ${index} ("${this.sequence[index]}")`);

		let next_step: string | null = null;
		const execute = async (idx: number, ...contexts: unknown[]) => {
			next_step = this.sequence[idx + 1] || null;

			if (idx >= this.sequence.length) {
				return;
			}

			const name = this.sequence[idx];
			const queue = this.queues.get(name);
			const middleware = this.middlewares.get(name);

			if (!queue || !middleware) {
				throw new Error(`Queue or middleware "${name}" not found`);
			}

			const next = (...ctx: unknown[]) => {
				return execute(idx + 1, ...ctx);
			};

			if (idx === index || middleware.immediate || opt.immediate) {
				this.log(`Running middleware "${name}"`);
				for (const context of contexts) {
					const check = middleware.schema.safeParse(context);
					if (!check.success) {
						throw new Error(
							`Context does not match schema for middleware "${name}": ${check.error.message}`,
							{ cause: check.error.cause },
						);
					}
					await middleware.exec(context, next);
				}
				this.log(`Finished middleware "${name}"`);
			} else {
				this.log(`Sending ${contexts.length} messages to queue "${name}"`);
				await queue.send(...contexts);
				this.log(`Sent to queue "${name}"`);
			}
		};

		await execute(index, context);

		return next_step;
	}

	public async begin(context: unknown, opt: RunOptions = {}): Promise<string | null> {
		if (this.sequence.length === 0) {
			throw new Error("No steps found");
		}

		return await this.run(this.sequence[0], context, opt);
	}
}
