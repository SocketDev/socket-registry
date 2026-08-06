/**
 * @file Content fingerprinting for the release check: hash what a package
 *   SHIPS, locally and as published, so "did this package change?" is answered
 *   from bytes rather than from a version number.
 *   Split out of release-npm-packages.mts so that entry stays under the
 *   file-size soft cap; the entry owns the bump decision, this module owns the
 *   comparison it decides on.
 *   The package.json hash deliberately covers only the fields that affect the
 *   tarball — never the version — so a bump does not make every package look
 *   changed on the next pass.
 */

import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { readFileUtf8 } from '@socketsecurity/lib-stable/fs/read-file'
import { isPlainObject as isObjectObject } from '@socketsecurity/lib-stable/objects/predicates'
import { toSortedObject } from '@socketsecurity/lib-stable/objects/sort'
import { extractPackage } from '@socketsecurity/lib-stable/packages/tarball'
import { minimatch } from 'minimatch'

import { PACKAGE_JSON } from '../constants/paths.mts'

const EXTRACT_PACKAGE_TMP_PREFIX = 'release-npm-'

export function sha256Hex(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

export function parsePackageJsonContent(
  content: string,
  filePath: string,
): Record<string, unknown> {
  try {
    return JSON.parse(content)
  } catch (e) {
    throw new Error(`Failed to parse package.json at ${filePath}`, {
      cause: e,
    })
  }
}

/**
 * Hash only the fields that affect what npm publishes (never the version).
 */
export function hashRelevantPackageJson(
  pkgJson: Record<string, unknown>,
): string {
  const exportsValue = pkgJson['exports']
  const relevantData = {
    dependencies: toSortedObject(
      (pkgJson['dependencies'] as Record<string, string>) ?? {},
    ),
    exports: isObjectObject(exportsValue)
      ? toSortedObject(exportsValue as Record<string, unknown>)
      : (exportsValue ?? undefined),
    files: pkgJson['files'] ?? undefined,
    sideEffects: pkgJson['sideEffects'] ?? undefined,
    engines: pkgJson['engines'] ?? undefined,
  }
  return sha256Hex(JSON.stringify(relevantData))
}

/**
 * Recursively walk `rootDir`, hashing every file `visitFile` accepts.
 * `shouldRecurse` gates descent into a directory by its path relative to
 * `rootDir`; `visitFile` returns the file's hash, or undefined to skip it.
 */
export async function collectFileHashes(
  rootDir: string,
  shouldRecurse: (relativePath: string) => boolean,
  visitFile: (
    fullPath: string,
    relativePath: string,
  ) => Promise<string | undefined>,
): Promise<Record<string, string>> {
  const fileHashes: Record<string, string> = {}
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (let i = 0, { length } = entries; i < length; i += 1) {
      const entry = entries[i]
      if (!entry) {
        continue
      }
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.relative(rootDir, fullPath)
      if (entry.isDirectory()) {
        if (shouldRecurse(relativePath)) {
          await walk(fullPath)
        }
      } else if (entry.isFile()) {
        const hash = await visitFile(fullPath, relativePath)
        if (hash !== undefined) {
          fileHashes[relativePath] = hash
        }
      }
    }
  }
  await walk(rootDir)
  return fileHashes
}

/**
 * Npm automatically includes LICENSE and README files with any case and
 * extension.
 */
export function isNpmAutoIncluded(fileName: string): boolean {
  const upperName = fileName.toUpperCase()
  return upperName.startsWith('LICENSE') || upperName.startsWith('README')
}

export async function getLocalPackageFileHashes(
  packagePath: string,
): Promise<Record<string, string>> {
  const pkgJsonPath = path.join(packagePath, PACKAGE_JSON)
  const pkgJsonContent = await readFileUtf8(pkgJsonPath)
  const pkgJson = parsePackageJsonContent(pkgJsonContent, pkgJsonPath)
  const filesPatterns: string[] = (pkgJson['files'] as string[]) ?? []

  const fileHashes = await collectFileHashes(
    packagePath,
    // Always recurse for patterns with ** or when we're at root level.
    relativePath =>
      relativePath === '' ||
      filesPatterns.some(
        pattern =>
          pattern.includes('**') || pattern.startsWith(`${relativePath}/`),
      ),
    async (fullPath, relativePath) => {
      const entryName = path.basename(fullPath)
      if (entryName === PACKAGE_JSON) {
        return undefined
      }
      // npm auto-includes LICENSE/README with any case/extension at root.
      const isRootAutoIncluded =
        relativePath === entryName && isNpmAutoIncluded(entryName)
      const matchesPattern = filesPatterns.some(pattern => {
        // Handle patterns like **/LICENSE{.original,}
        if (pattern.includes('**')) {
          const fileName = path.basename(relativePath)
          const filePattern = pattern.replace('**/', '')
          return (
            minimatch(fileName, filePattern) || minimatch(relativePath, pattern)
          )
        }
        return minimatch(relativePath, pattern)
      })
      return isRootAutoIncluded || matchesPattern
        ? sha256Hex(await readFileUtf8(fullPath))
        : undefined
    },
  )

  fileHashes[PACKAGE_JSON] = hashRelevantPackageJson(pkgJson)
  return toSortedObject(fileHashes)
}

export async function getRemotePackageFileHashes(
  spec: string,
): Promise<Record<string, string>> {
  let fileHashes: Record<string, string> = {}
  await extractPackage(
    spec,
    { tmpPrefix: EXTRACT_PACKAGE_TMP_PREFIX },
    async tmpDir => {
      fileHashes = await collectFileHashes(
        tmpDir,
        () => true,
        async fullPath => {
          const content = await readFileUtf8(fullPath)
          // For package.json, hash only relevant fields (not version).
          return path.basename(fullPath) === PACKAGE_JSON
            ? hashRelevantPackageJson(
                parsePackageJsonContent(content, fullPath),
              )
            : sha256Hex(content)
        },
      )
    },
  )
  return toSortedObject(fileHashes)
}
