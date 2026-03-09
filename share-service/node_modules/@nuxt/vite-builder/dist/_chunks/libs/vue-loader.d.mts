import { CompilerOptions, SFCScriptCompileOptions, SFCTemplateCompileOptions, TemplateCompiler } from "vue/compiler-sfc";

//#region ../../node_modules/.pnpm/vue-loader@17.4.2_@vue+compiler-sfc@3.5.27_vue@3.5.27_typescript@5.9.3__webpack@5.105.0_esbuild@0.27.3_/node_modules/vue-loader/dist/index.d.ts
interface VueLoaderOptions {
  babelParserPlugins?: SFCScriptCompileOptions['babelParserPlugins'];
  transformAssetUrls?: SFCTemplateCompileOptions['transformAssetUrls'];
  compiler?: TemplateCompiler | string;
  compilerOptions?: CompilerOptions;
  /**
   * TODO remove in 3.4
   * @deprecated
   */
  reactivityTransform?: boolean;
  /**
   * @experimental
   */
  propsDestructure?: boolean;
  /**
   * @experimental
   */
  defineModel?: boolean;
  customElement?: boolean | RegExp;
  hotReload?: boolean;
  exposeFilename?: boolean;
  appendExtension?: boolean;
  enableTsInTemplate?: boolean;
  experimentalInlineMatchResource?: boolean;
  isServerBuild?: boolean;
}
//#endregion
export { VueLoaderOptions as t };