import "./_chunks/rolldown-runtime.mjs";
import "./_chunks/libs/c12.mjs";
import "./_chunks/libs/@vue/compiler-sfc.mjs";
import "./_chunks/libs/@unhead/vue.mjs";
import "./_chunks/libs/unctx.mjs";
import "./_chunks/libs/h3.mjs";
import "./_chunks/libs/ofetch.mjs";
import "./_chunks/libs/@vue/language-core.mjs";
import "./_chunks/libs/css-minimizer-webpack-plugin.mjs";
import "./_chunks/libs/mini-css-extract-plugin.mjs";
import "./_chunks/libs/esbuild-loader.mjs";
import "./_chunks/libs/@types/pug.mjs";
import "./_chunks/libs/vue-loader.mjs";
import "./_chunks/libs/webpack-dev-middleware.mjs";
import "./_chunks/libs/vue-router.mjs";
import "./_chunks/libs/unimport.mjs";
import { t as NuxtBuilder } from "./_chunks/index.mjs";
import { EnvironmentOptions } from "vite";
import { ViteConfig } from "nuxt/schema";

//#region src/vite.d.ts
declare const bundle: NuxtBuilder["bundle"];
//#endregion
//#region src/index.d.ts
declare module "nuxt/schema" {
  interface ViteOptions extends ViteConfig {
    $client?: EnvironmentOptions;
    $server?: EnvironmentOptions;
    viteNode?: {
      maxRetryAttempts?: number; /** in milliseconds */
      baseRetryDelay?: number; /** in milliseconds */
      maxRetryDelay?: number; /** in milliseconds */
      requestTimeout?: number;
    };
  }
}
//#endregion
export { bundle };