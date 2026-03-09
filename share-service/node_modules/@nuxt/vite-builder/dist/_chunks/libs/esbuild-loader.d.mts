import { TransformOptions, transform } from "esbuild";

//#region ../../node_modules/.pnpm/esbuild-loader@4.4.2_webpack@5.105.0_esbuild@0.27.3_/node_modules/esbuild-loader/dist/index.d.cts
type Implementation = {
  transform: typeof transform;
};
type Except<ObjectType, Properties> = { [Key in keyof ObjectType as (Key extends Properties ? never : Key)]: ObjectType[Key] };
type LoaderOptions = Except<TransformOptions, 'sourcemap' | 'sourcefile'> & {
  /** Pass a custom esbuild implementation */implementation?: Implementation;
  /**
   * Path to tsconfig.json file
   */
  tsconfig?: string;
};
//#endregion
export { LoaderOptions as t };