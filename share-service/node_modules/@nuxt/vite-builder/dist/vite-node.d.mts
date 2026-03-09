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
import "./_chunks/index.mjs";
import { PluginContainer } from "vite";
import { Socket } from "node:net";
import { Manifest } from "vue-bundle-renderer";
import { FetchResult } from "vite-node";

//#region src/plugins/vite-node.d.ts
type ResolveIdResponse = Awaited<ReturnType<PluginContainer["resolveId"]>>;
interface ViteNodeFetch {
  /**  Gets the client manifest. */
  getManifest(): Promise<Manifest>;
  /** Gets the list of invalidated files. */
  getInvalidates(): Promise<string[]>;
  /** Resolves a module ID. */
  resolveId(id: string, importer?: string): Promise<ResolveIdResponse | null>;
  /** Fetches a module. */
  fetchModule(moduleId: string): Promise<FetchResult>;
  /** Ensures the IPC socket is connected. */
  ensureConnected(): Promise<Socket>;
}
type ViteNodeServerOptions = {
  baseURL: string;
  socketPath: string;
  root: string;
  entryPath: string;
  base: string;
  maxRetryAttempts?: number;
  baseRetryDelay?: number;
  maxRetryDelay?: number;
  requestTimeout?: number;
};
//#endregion
//#region src/vite-node.d.ts
declare const viteNodeOptions: ViteNodeServerOptions;
declare const viteNodeFetch: ViteNodeFetch;
//#endregion
export { viteNodeFetch, viteNodeOptions };