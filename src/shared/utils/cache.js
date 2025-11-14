// src/shared/utils/cache.js
// Minimal JSON file cache utilities for CLI commands.

import fs from 'fs';
import path from 'path';

const CACHE_ROOT = path.resolve(process.cwd(), '.routerx-cache');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_ROOT)) {
    fs.mkdirSync(CACHE_ROOT, { recursive: true });
  }
}

function cachePath(key) {
  const safeKey = key.replace(/[^a-z0-9_-]+/gi, '-');
  return path.join(CACHE_ROOT, `${safeKey}.json`);
}

export function readJsonCache(key, maxAgeMs) {
  try {
    const file = cachePath(key);
    if (!fs.existsSync(file)) {
      return null;
    }

    const stats = fs.statSync(file);
    if (Number.isFinite(maxAgeMs) && maxAgeMs > 0) {
      const age = Date.now() - stats.mtimeMs;
      if (age > maxAgeMs) {
        return null;
      }
    }

    const payload = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return {
      savedAt: stats.mtimeMs,
      data: payload
    };
  } catch {
    return null;
  }
}

export function writeJsonCache(key, data) {
  try {
    ensureCacheDir();
    const file = cachePath(key);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch {
    // Best-effort cache; ignore failures silently.
  }
}
