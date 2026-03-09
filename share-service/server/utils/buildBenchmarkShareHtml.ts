import { getBenchmarkShareAssets } from "./benchmarkShareAssets";
import { buildBenchmarkShareMarkup } from "./benchmarkShareMarkup";
import { BENCHMARK_SHARE_DESKTOP_CSS } from "./benchmarkShareStyles";
import {
  buildShareThemeCss,
  resolveShareThemeColors
} from "./benchmarkShareTheme";
import type { ShareSnapshot } from "./shareSnapshot";

export async function buildBenchmarkShareRender(snapshot: ShareSnapshot) {
  const assets = await getBenchmarkShareAssets();
  const theme = resolveShareThemeColors(snapshot);
  const styles = `${buildShareThemeCss(theme)}\n${BENCHMARK_SHARE_DESKTOP_CSS}`;
  const markup = buildBenchmarkShareMarkup(snapshot, assets, theme);
  return { styles, markup };
}

export async function buildBenchmarkShareHtml(snapshot: ShareSnapshot) {
  const render = await buildBenchmarkShareRender(snapshot);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Benchmark Share</title>
    <style>${render.styles}</style>
  </head>
  <body class="share-render-static">
    ${render.markup}
  </body>
</html>`;
}
