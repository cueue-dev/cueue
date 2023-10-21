import debug from "debug";
import type { Context, Middleware, Queue, RunOptions } from "./types";

export class Cueue {
	protected queues = new Map<string, Queue>();
	protected middlewares = new Map<string, Middleware<unknown>>();
	protected sequence: string[] = [];
	protected log = debug("cueue");

	/**
	 * Add a middleware.
	 */
	public use<T extends Context>(queue: Queue<T>, middleware: Middleware<T>): this {
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

	public async forward(
		step: string | number,
		context: Context,
		opt: RunOptions = {},
	): Promise<string | null> {
		const index = typeof step === "string" ? this.sequence.indexOf(step) : step;
		if (index === -1) {
			throw new Error(`Step "${step}" not found`);
		}
		this.log(`Forwarding at step ${index} ("${this.sequence[index]}")`);

		const next_step: string | null = this.sequence[index + 1] || null;
		const name = this.sequence[index];
		const queue = this.queues.get(name);
		const middleware = this.middlewares.get(name);

		if (!queue || !middleware) {
			throw new Error(`Queue or middleware "${name}" not found`);
		}

		const next = async (...ctx: Context[]) => {
			if (next_step === null) {
				return;
			}
			if (ctx.length === 0) {
				return;
			}

			this.log(`Sending ${ctx.length} messages to "${next_step}"`);
			const contexts = ctx.map((c) => ({
				...context,
				...c,
			}));
			await queue.send(...contexts);
			this.log(`Sent to "${next_step}"`);
		};

		this.log(`Executing step "${name}"`);
		const check = middleware.schema.safeParse(context);
		if (!check.success) {
			throw new Error(
				`Context does not match schema for step "${name}": ${check.error.message}`,
				{ cause: check.error.cause },
			);
		}
		await middleware.exec(context, next, (s, c) => this.forward(s, c, opt));
		this.log(`Finished step "${name}"`);

		return next_step;
	}

	public async begin(context: Context, opt: RunOptions = {}): Promise<string | null> {
		if (this.sequence.length === 0) {
			throw new Error("No steps found");
		}

		return await this.forward(this.sequence[0], context, opt);
	}
}
