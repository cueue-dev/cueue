# Cueue + Cloudflare Queues Example

It's a very simple example to analyze and reply to emails with Cloudflare AI.

## Setup

### Cloudflare Queues

```sh
wrangler queues create cueue-email-parse-queue
wrangler queues create cueue-email-analyze-queue
wrangler queues create cueue-email-send-queue
```

### R2 Bucket

R2 bucket is optional, if not enabled, the email size will be limited to 100KB.

```sh
wrangler r2 bucket create cueue-email-files
```
