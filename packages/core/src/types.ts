import type { z } from "zod";

export interface Queue<T = unknown> {
	name: string;
	send(...messages: T[]): Promise<void>;
}

export type MiddlewareExec<Input = unknown, Output = unknown> = (
	context: Input,
	next: (...ctx: Output[]) => Promise<void>,
) => Promise<void> | void;

export interface Middleware<T = unknown> {
	/** The schema for the context object. */
	schema: z.ZodSchema<T>;
	exec: MiddlewareExec<T>;
	/** Should this middleware be executed immediately after the previous middleware, or being added to the queue? */
	immediate?: boolean;
}

export interface RunOptions {
	/** Force the middlewares to be executed immediately, even if they are not marked as immediate. */
	immediate?: boolean;
}
