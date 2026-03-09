<script setup lang="ts">
import type { ShareSnapshot } from "../../server/utils/shareSnapshot";

const props = defineProps<{
  snapshot?: ShareSnapshot
  snapshotId?: string
}>();

async function resolveRender() {
  if (!import.meta.server) {
    return { styles: "", markup: "" };
  }

  const [{ buildBenchmarkShareRender }, { normalizeShareSnapshot }, { getShareSnapshot }] = await Promise.all([
    import("../../server/utils/buildBenchmarkShareHtml"),
    import("../../server/utils/shareSnapshot"),
    import("../../server/utils/shareSnapshotStore")
  ]);

  const providedSnapshot = props.snapshot && Object.keys(props.snapshot).length
    ? props.snapshot
    : null;
  const storedSnapshot = !providedSnapshot && props.snapshotId
    ? getShareSnapshot(props.snapshotId) || {}
    : {};

  return buildBenchmarkShareRender(normalizeShareSnapshot(providedSnapshot || storedSnapshot));
}

const render = await resolveRender();

useHead({
  bodyAttrs: {
    class: "share-render-static"
  },
  style: [
    {
      key: "benchmark-share-og-render",
      children: render.styles
    }
  ]
});
</script>

<template>
  <div v-html="render.markup" />
</template>
