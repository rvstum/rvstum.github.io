import { spawn } from "node:child_process";
import { readFile, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, "..");
const nuxtEntry = join(projectRoot, "node_modules", "nuxt", "bin", "nuxt.mjs");
const devLockPath = join(projectRoot, ".dev-server.lock");

async function removeBuildArtifacts() {
  await Promise.all([
    rm(join(projectRoot, ".nuxt"), { recursive: true, force: true }),
    rm(join(projectRoot, ".output"), { recursive: true, force: true })
  ]);
}

function isErrorWithCode(value) {
  return Boolean(value && typeof value === "object" && "code" in value);
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function acquireDevLock() {
  try {
    const raw = await readFile(devLockPath, "utf8");
    const lock = JSON.parse(raw);
    const existingPid = Number(lock?.pid);
    if (existingPid !== process.pid && isProcessAlive(existingPid)) {
      throw new Error(
        `Share service dev server is already running (pid ${existingPid}). `
        + "Stop it before starting another instance."
      );
    }
  } catch (error) {
    if (isErrorWithCode(error) && error.code === "ENOENT") {
      // No existing lock.
    } else if (error instanceof Error) {
      throw error;
    }
  }

  await writeFile(devLockPath, JSON.stringify({
    pid: process.pid,
    createdAt: Date.now()
  }), "utf8");
}

async function releaseDevLock() {
  try {
    await unlink(devLockPath);
  } catch (error) {
    if (isErrorWithCode(error) && error.code === "ENOENT") return;
    throw error;
  }
}

async function main() {
  await acquireDevLock();
  await removeBuildArtifacts();

  const port = process.env.PORT || "3000";
  const child = spawn(process.execPath, [nuxtEntry, "dev", "--port", port], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      releaseDevLock()
        .catch(() => {})
        .finally(() => process.kill(process.pid, signal));
      return;
    }

    releaseDevLock()
      .catch(() => {})
      .finally(() => process.exit(code ?? 0));
  });

  child.on("error", (error) => {
    console.error(error);
    releaseDevLock()
      .catch(() => {})
      .finally(() => process.exit(1));
  });
}

main().catch((error) => {
  console.error(error);
  releaseDevLock()
    .catch(() => {})
    .finally(() => process.exit(1));
});
