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
  const normalized = relativePath.replace(/^\.?\




















