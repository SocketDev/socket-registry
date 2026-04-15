/**
 * @fileoverview Registry-specific utilities for scripts.
 * For common utilities, import directly from @socketsecurity/lib.
 */

import { promises as fs } from 'node:fs'

// Sort object keys alphabetically.
export function toSortedObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj
  }

  const sorted = Object.create(null)
  const keys = Object.keys(obj).sort()

  for (const key of keys) {
    sorted[key] = obj[key]
  }

  return sorted
}

// Read and parse package.json.
export async function readPackageJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  return JSON.parse(content)
}

// Write package.json with proper formatting.
export async function writePackageJson(filePath, data) {
  const content = `${JSON.stringify(data, null, 2)}\n`
  await fs.writeFile(filePath, content, 'utf8')
}
