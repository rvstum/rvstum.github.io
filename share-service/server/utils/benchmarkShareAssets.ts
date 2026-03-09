import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type BenchmarkShareAssets = {
  trophy: string;
  sword: string;
  bomb: string;
};

const assetCache = new Map<string, string>();

function getMimeType(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

async function getAssetDataUri(relativePath: string) {
  const normalized = relativePath.replace(/^\.?\/*/, "");
  if (assetCache.has(normalized)) {
    return assetCache.get(normalized) || "";
  }

  const filePath = resolve(process.cwd(), "..", normalized);
  const buffer = await readFile(filePath);
  const uri = `data:${getMimeType(filePath)};base64,${buffer.toString("base64")}`;
  assetCache.set(normalized, uri);
  return uri;
}

export async function getBenchmarkShareAssets(): Promise<BenchmarkShareAssets> {
  const [trophy, sword, bomb] = await Promise.all([
    getAssetDataUri("icons/trophy.png"),
    getAssetDataUri("icons/benchmarksword.jpg"),
    getAssetDataUri("icons/benchmarkbomb.jpg")
  ]);

  return { trophy, sword, bomb };
}
