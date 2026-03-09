<script setup lang="ts">
const route = useRoute();
const id = typeof route.params.id === "string" ? route.params.id : "";

defineOgImageComponent("BenchmarkShare", {
  snapshotId: id
}, {
  width: 1600,
  height: 2000
});
</script>

<template>
  <main
    style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      background: #050505;
      color: #f6eee7;
      font-family: Arial, sans-serif;
    "
  >
    <div style="max-width: 760px; text-align: center; line-height: 1.5;">
      <h1 style="font-size: 32px; margin: 0 0 12px;">Benchmark Share Renderer</h1>
      <p style="margin: 0 0 10px;">This route is used by the benchmark site to render a stored share snapshot.</p>
      <p style="margin: 0; color: #c9b2a0;">
        Generate a snapshot through <code>/api/share-snapshot</code>, then open the returned OG image URL.
      </p>
    </div>
  </main>
</template>
