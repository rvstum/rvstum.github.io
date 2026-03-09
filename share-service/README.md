# Benchmark Share Service

Separate Nuxt OG Image service for rendering benchmark share images outside the mobile browser.

## Setup

1. Install dependencies:

```bash
cd share-service
npm install
```

2. Run locally:

```bash
npm run dev
```

This clears stale `.nuxt` and `.output` build artifacts before Nuxt starts, which avoids the missing `server.mjs` state after interrupted dev runs.

3. Set your main benchmark app to use it by defining a global before the benchmark scripts run:

```html
<script>
  window.__BENCHMARK_SHARE_SERVICE_URL__ = "http://localhost:3000";
</script>
```

If `3000` is already taken and Nuxt moves to `3001`, the benchmark client now retries `3001` automatically on localhost.

## Snapshot Flow

The benchmark app now posts a normalized snapshot to:

```txt
http://localhost:3000/api/share-snapshot
```

The service returns an image URL like:

```txt
http://localhost:3000/__og-image__/image/render/og.png?id=<id>
```

## Notes

- The poster layout is fixed-size and separate from the live benchmark DOM.
- This avoids the mobile screenshot failures caused by browser memory limits and responsive layout leakage.
- The in-memory snapshot store is intended for local/dev use. A real deployment should back snapshots with durable storage if you run multiple instances.
- Adjust `components/OgImage/BenchmarkShare.vue` to refine the exported image design.
