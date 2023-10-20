# Cueue + Cloudflare Queues Example

It's a very simple example to crawl images from a URL and send them to a Discord channel.

## Setup

### R2 Bucket

```sh
wrangler r2 bucket create cueue-example-images
```

### Cloudflare Queues

```sh
wrangler queues create cueue-crawl-queue
wrangler queues create cueue-save-queue
wrangler queues create cueue-notify-queue
```

### Secret

```sh
wrangler secret put DISCORD_WEBHOOK
```
