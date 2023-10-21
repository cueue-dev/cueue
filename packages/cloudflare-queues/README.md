# @cueue/cloudflare-queues

## Example

```ts
/**
 * This is an example of how to use Cueue with Cloudflare Queues to
 * download images from a URL and save them to R2, then send a Discord
 * message with the image.
 */

import { CloudflareCueue } from "@cueue/cloudflare-queues";
import type { Context } from "@cueue/core";
import { crawler } from "./crawler";
import { discord } from "./discord";
import { saver } from "./saver";

interface Env {
    crawl: Queue<{ url: string }>;
    save: Queue<{ image: string }>;
    notify: Queue<{ webhook: string; message: string; filename: string }>;
    r2: R2Bucket;
    DISCORD_WEBHOOK: string;
}

function build(env: Env): CloudflareCueue {
    return new CloudflareCueue()
        .use("cueue-crawl-queue", env.crawl, crawler(env))
        .use("cueue-save-queue", env.save, saver(env))
        .use("cueue-notify-queue", env.notify, discord(env));
}

export default {
    async fetch(req: Request, env: Env): Promise<Response> {
        const search = new URL(req.url).searchParams;
        const url = search.get("url");
        if (!url) {
            return new Response("Missing URL", { status: 400 });
        }

        try {
            new URL(url);
        } catch {
            return new Response("Invalid URL", { status: 400 });
        }

        await build(env).begin({ url });
        return new Response("OK");
    },
    async queue(batch: MessageBatch<Context>, env: Env): Promise<void> {
        await build(env).take(batch);
    },
};
```

See [examples/cloudflare-queues](../../examples/cloudflare-queues) for a full example.
