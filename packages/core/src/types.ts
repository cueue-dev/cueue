import type { z } from "zod";

export type Context = Record<string, unknown>;

export interface Queue<T extends Context = Context> {
	name: string;
	send(...messages: T[]): Promise<void>;
}

export type ConsumerExec<Input extends Context = Context, Output extends Context = Context> = (
	context: Input,
	next: (...ctx: Output[]) => Promise<void>,
	forward: (step: string | number, context: Context) => Promise<string | null>,
) => Promise<void> | void;

export interface Consumer<T extends Context = Context> {
	/** The schema for the context object. */
	schema: z.ZodSchema<T>;
	exec: ConsumerExec<T>;
}

export interface RunOptions {}
