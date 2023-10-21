import debug from "debug";
import { Cueue } from "../cueue";
import type { Context, Queue } from "../types";

const DEFAULT_DELAY = (c: number) => (Math.pow(2, c) - 1) * 1000;
const DEFAULT_RETRY = 3;

export interface BaseQueueOptions {
	/**
	 * Delay between retries in milliseconds.
	 * Can be a function that takes the number of retries and returns a delay.
	 * @default (c) => (Math.pow(2, c) - 1) * 1000
	 */
	delay?: number | ((count: number) => number);
	/**
	 * Number of times to retry sending a message.
	 * @default 3
	 */
	retry?: number;
}

export class BaseQueue implements Queue {
	public name: string;
	protected cueue: Cueue;
	protected opt: BaseQueueOptions;
	protected log: debug.Debugger;

	/**
	 * Creates a new instance of the BaseQueue class.
	 * @constructor
	 * @param {string} name - The name of the queue.
	 * @param {Cueue} cueue - The Cueue instance that the queue belongs to.
	 * @param {BaseQueueOptions} [opt={}] - Optional settings for the queue.
	 */
	constructor(name: string, cueue: Cueue, opt: BaseQueueOptions = {}) {
		this.cueue = cueue;
		this.name = name;
		this.opt = opt;
		this.log = debug(`base-queue:${name}`);
	}

	public async send(...messages: Context[]): Promise<void> {
		this.log(`Sending ${messages.length} messages`);
		Promise.all(messages.map((m) => this._send(m, 0))).catch((err) => this.log(err));
	}

	protected async _send(message: Context, count: number): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, this.delay(count)));

		try {
			await this.cueue.forward(this.name, message);
		} catch (err) {
			if (count < this.retry()) {
				this.log(`Retrying message ${count + 1} of ${this.opt.retry}`);
				await this._send(message, count + 1);
			} else {
				this.log(`Message failed after ${count} retries`);
				throw err;
			}
		}
	}

	protected delay(count: number): number {
		if (typeof this.opt.delay === "function") {
			return this.opt.delay(count);
		}
		return this.opt.delay || DEFAULT_DELAY(count);
	}

	protected retry(): number {
		return this.opt.retry || DEFAULT_RETRY;
	}
}
