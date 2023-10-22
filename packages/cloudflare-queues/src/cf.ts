import type { Queue as CloudflareQueue, MessageBatch } from "@cloudflare/workers-types";
import type { Consumer, Context, Queue, RunOptions } from "@cueue/core";
import { Cueue } from "@cueue/core";

export class CloudflareCueue extends Cueue {
	/**
	 * Add a consumer.
	 * @param queue_name The name of the queue, must match the name of the queue in the Cloudflare dashboard.
	 * @param cloudflare_queue The Cloudflare queue.
	 * @param consumer The consumer to use.
	 */
	use<T extends Context>(
		queue_name: string,
		cloudflare_queue: CloudflareQueue<T>,
		consumer: Consumer<T>,
	): this;
	use<T extends Context>(queue: Queue<T>, consumer: Consumer<T>): this;
	use<T extends Context>(
		name_queue: string | Queue<T>,
		queue_consumer: CloudflareQueue<T> | Consumer<T>,
		consumer?: Consumer<T>,
	): this {
		if (typeof name_queue !== "string" && "exec" in queue_consumer) {
			return super.use(name_queue, queue_consumer);
		} else if (typeof name_queue === "string" && "send" in queue_consumer && consumer) {
			const queue: Queue<T> = {
				name: name_queue,
				send: async (...messages) => {
					if (messages.length === 0) {
						return;
					}

					if (messages.length === 1) {
						const m = messages[0];
						const is_json = json_serializable(m);
						if (is_json) {
							return queue_consumer.send(m, { contentType: "json" });
						} else {
							return queue_consumer.send(m);
						}
					} else {
						const data = messages.map((m) => {
							const is_json = json_serializable(m);
							if (is_json) {
								return { body: m, contentType: "json" as const };
							} else {
								return { body: m };
							}
						});

						return queue_consumer.sendBatch(data);
					}
				},
			};
			return super.use(queue, consumer);
		} else {
			throw new Error("Invalid arguments");
		}
	}

	public async take<T extends Context>(
		batch: MessageBatch<T>,
		opts: Record<string, RunOptions> = {},
	) {
		const from = batch.queue;

		const queue = this.queues.get(from);

		if (!queue) {
			throw new Error(`Queue "${from}" not found`);
		}

		for (const message of batch.messages) {
			await this.forward(from, message.body, opts[from] || {});
			message.ack();
		}
	}
}

function json_serializable(m: unknown): boolean {
	if (
		typeof m === "string" ||
		typeof m === "number" ||
		typeof m === "boolean" ||
		typeof m === "undefined" ||
		m === null
	) {
		return true;
	} else if (
		m instanceof ArrayBuffer ||
		m instanceof DataView ||
		m instanceof Date ||
		m instanceof RegExp ||
		m instanceof Error ||
		m instanceof Promise ||
		m instanceof URL ||
		m instanceof URLSearchParams ||
		m instanceof Map ||
		m instanceof Set ||
		m instanceof WeakMap ||
		m instanceof WeakSet
	) {
		return false;
	} else if (Array.isArray(m)) {
		return m.every((i) => json_serializable(i));
	} else if (typeof m === "object") {
		return Object.values(m).every((i) => json_serializable(i));
	} else {
		return false;
	}
}
