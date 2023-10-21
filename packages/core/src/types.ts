import type { z } from "zod";

export type Context = Record<string, unknown>;

export interface Queue<T = Context> {
	name: string;
	send(...messages: T[]): Promise<void>;
}

export type MiddlewareExec<Input = Context, Output extends Context = Context> = (
	context: Input,
	next: (...ctx: Output[]) => Promise<void>,
	forward: (step: string | number, context: Context) => Promise<string | null>,
) => Promise<void> | void;

export interface Middleware<T = Context> {
	/** The schema for the context object. */
	schema: z.ZodSchema<T>;
	exec: MiddlewareExec<T>;
}

export interface RunOptions {}
