export default defineNuxtConfig({
  devtools: { enabled: false },
  modules: ["nuxt-og-image"],
  app: {
    head: {
      title: "Benchmark Share Service"
    }
  },
  css: [],
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000",
    name: "Benchmark Share Service"
  },
  ogImage: {
    defaults: {
      width: 1600,
      height: 2000,
      renderer: "chromium"
    }
  },
  experimental: {
    viteEnvironmentApi: true
  },
  vite: {
    plugins: [
      {
        name: "benchmark-share-app-manifest-fallback",
        enforce: "pre",
        resolveId(id: string) {
          if (id === "#app-manifest") return "\0benchmark-share-app-manifest";
          return null;
        },
        load(id: string) {
          if (id === "\0benchmark-share-app-manifest") {
            return "export default {}";
          }
          return null;
        }
      }
    ]
  },
  compatibilityDate: "2025-02-01"
});
