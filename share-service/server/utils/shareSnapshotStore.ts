import { randomBytes } from "node:crypto";

import type { ShareSnapshot } from "./shareSnapshot";

type ShareSnapshotEntry = {
  snapshot: ShareSnapshot
  createdAt: number
  bytes: number
};

const SNAPSHOT_TTL_MS = 1000 * 60 * 30;
const MAX_SNAPSHOT_COUNT = 60;
const MAX_STORE_BYTES = 96 * 1024 * 1024;
const snapshotStore = new Map<string, ShareSnapshotEntry>();
let snapshotStoreBytes = 0;

function estimateSnapshotBytes(snapshot: ShareSnapshot) {
  try {
    return Buffer.byteLength(JSON.stringify(snapshot), "utf8");
  } catch {
    return 0;
  }
}

function removeSnapshot(id: string) {
  const entry = snapshotStore.get(id);
  if (!entry) return;
  snapshotStore.delete(id);
  snapshotStoreBytes = Math.max(0, snapshotStoreBytes - entry.bytes);
}

function pruneExpiredSnapshots(now = Date.now()) {
  const expiredIds: string[] = [];
  snapshotStore.forEach((entry, id) => {
    if ((now - entry.createdAt) > SNAPSHOT_TTL_MS) {
      expiredIds.push(id);
    }
  });
  expiredIds.forEach((id) => removeSnapshot(id));
}

function enforceSnapshotLimits() {
  while (snapshotStore.size > MAX_SNAPSHOT_COUNT || snapshotStoreBytes > MAX_STORE_BYTES) {
    const oldestId = snapshotStore.keys().next().value as string | undefined;
    if (!oldestId) break;
    removeSnapshot(oldestId);
  }
}

export function createShareSnapshotId() {
  return randomBytes(6).toString("base64url");
}

export function saveShareSnapshot(snapshot: ShareSnapshot) {
  pruneExpiredSnapshots();
  const id = createShareSnapshotId();
  const bytes = estimateSnapshotBytes(snapshot);
  snapshotStore.set(id, {
    snapshot,
    createdAt: Date.now(),
    bytes
  });
  snapshotStoreBytes += bytes;
  enforceSnapshotLimits();
  return id;
}

export function getShareSnapshot(id: string) {
  pruneExpiredSnapshots();
  const entry = snapshotStore.get(id);
  return entry ? entry.snapshot : null;
}
