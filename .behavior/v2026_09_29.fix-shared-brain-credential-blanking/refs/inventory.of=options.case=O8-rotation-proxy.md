# option O8: local rotation proxy via ANTHROPIC_BASE_URL

## .what

each clone spawns with `ANTHROPIC_BASE_URL` at a local proxy that holds every subscription's token.
per request, the proxy swaps in a subscription's auth, reads the `anthropic-ratelimit-unified-*`
response headers for the 5-hour and weekly usage, and on a 429 retries on another subscription.

## .verdict — 🟡 works, heavy

- ✅ rotation per request; a usage limit is seen before it hits, from the headers
- ✅ clones hold no real credential, so no refresh race
- ⛔ a daemon in every request path — if it stalls, the whole box stalls, the same blast radius as
  today's blank
- ⚠️ it must relay streamed replies faithfully, plus cancel and timeout
- ⚠️ claude-code skips some lookups under a custom base url (below)
- ⚠️ `/status` shows the spawn login while another subscription is billed
- ⚠️ the header swap sits closest to what tool authors report as enforced: subscription
  credentials run through third-party clients

## .citations

```
not fetched with a custom ANTHROPIC_BASE_URL
```

precedent: <https://github.com/doxaras/claude-rotate>,
<https://wavect.io/blog/claude-rotate-multi-account-proxy/>
