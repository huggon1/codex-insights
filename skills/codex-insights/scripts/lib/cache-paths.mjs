import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const LIB_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(LIB_DIR, "..", "..", "..", "..")

export function resolveCacheRoot() {
  return resolve(REPO_ROOT, ".codex-insights", "cache")
}

export function resolveFacetCacheDir() {
  return resolve(resolveCacheRoot(), "facets")
}

export function resolveSectionCacheDir() {
  return resolve(resolveCacheRoot(), "sections")
}

export function resolveErrorLogDir() {
  return resolve(resolveCacheRoot(), "errors")
}
