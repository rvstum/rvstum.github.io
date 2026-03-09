<script setup lang="ts">
const route = useRoute();
const id = typeof route.query.id === "string" ? route.query.id : "";
const emptyRender = { styles: "", markup: "" };
const { data } = id
  ? await useFetch(`/api/share-render/${encodeURIComponent(id)}`, {
      key: `share-render:${id}`,
      server: true,
      default: () => emptyRender
    })
  : { data: ref(emptyRender) };

const render = computed(() => data.value || emptyRender);

useHead({
  bodyAttrs: {
    class: "share-render-static"
  },
  style: [
    {
      key: "benchmark-share-render",
      children: render.value.styles
    }
  ]
});

defineOgImage({
  component: "PageScreenshot",
  renderer: "chromium",
  extension: "jpeg",
  width: 1600,
  height: 2250,
  screenshot: {
    selector: "#share-root",
    delay: 120
  }
});
</script>

<template>
  <div v-html="render.markup" />
</template>
