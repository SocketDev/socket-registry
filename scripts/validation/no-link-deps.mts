/**
 * @fileoverview Validates that no package.json files contain link: dependencies.
 * Link dependencies are prohibited - use workspace: or catalog: instead.
 */
/* oxlint-disable socket/prefer-cached-for-loop -- iterates Map.entries() / destructured tuples; the cached-length rewrite would be incorrect. */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getDefaultLogger } from '@socketsecurity/lib/logger'

import { runValidationScript } from '../utils/validation-runner.mts'

const logger = getDefaultLogger()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..', '..')

/**
 * Check if a package.json contains link: dependencies.
 */
export async function checkPackageJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  const pkg = JSON.parse(content)

  const violations = []

  // Check dependencies.
  if (pkg.dependencies) {
    for (const [name, version] of Object.entries(pkg.dependencies)) {
      if (typeof version === 'string' && version.startsWith('link:')) {
        violations.push({
          file: filePath,
          field: 'dependencies',
          package: name,
          value: version,
        })
      }
    }
  }

  // Check devDependencies.
  if (pkg.devDependencies) {
    for (const [name, version] of Object.entries(pkg.devDependencies)) {
      if (typeof version === 'string' && version.startsWith('link:')) {
        violations.push({
          file: filePath,
          field: 'devDependencies',
          package: name,
          value: version,
        })
      }
    }
  }

  // Check peerDependencies.
  if (pkg.peerDependencies) {
    for (const [name, version] of Object.entries(pkg.peerDependencies)) {
      if (typeof version === 'string' && version.startsWith('link:')) {
        violations.push({
          file: filePath,
          field: 'peerDependencies',
          package: name,
          value: version,
        })
      }
    }
  }

  // Check optionalDependencies.
  if (pkg.optionalDependencies) {
    for (const [name, version] of Object.entries(pkg.optionalDependencies)) {
      if (typeof version === 'string' && version.startsWith('link:')) {
        violations.push({
          file: filePath,
          field: 'optionalDependencies',
          package: name,
          value: version,
        })
      }
    }
  }

  return violations
}

/**
 * Find all package.json files in the repository.
 */
export async function findPackageJsonFiles(dir) {
  const files = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (let i = 0, { length } = entries; i < length; i += 1) {
    const entry = entries[i]
    const fullPath = path.join(dir, entry.name)

    // Skip node_modules, .git, and build directories.
    if (
      entry.name === '.git' ||
      entry.name === 'build' ||
      entry.name === 'dist' ||
      entry.name === 'node_modules'
    ) {
      continue
    }

    if (entry.isDirectory()) {
      files.push(...(await findPackageJsonFiles(fullPath)))
    } else if (entry.name === 'package.json') {
      files.push(fullPath)
    }
  }

  return files
}

async function main(): Promise<void> {
  await runValidationScript(
    async () => {
      const packageJsonFiles = await findPackageJsonFiles(rootPath)
      const allViolations = []

      for (let i = 0, { length } = packageJsonFiles; i < length; i += 1) {
        const file = packageJsonFiles[i]
        const violations = await checkPackageJson(file)
        allViolations.push(...violations)
      }

      if (allViolations.length > 0) {
        logger.log('')
        logger.log(
          'Use workspace: protocol for monorepo packages or catalog: for centralized versions.',
        )
        logger.log('')

        for (let i = 0, { length } = allViolations; i < length; i += 1) {
          const violation = allViolations[i]
          const relativePath = path.relative(rootPath, violation.file)
          logger.log(`  ${relativePath}`)
          logger.log(
            `    ${violation.field}.${violation.package}: "${violation.value}"`,
          )
        }

        logger.log('')
        logger.log('Replace link: with:')
        logger.log('  - workspace: for monorepo packages')
        logger.log('  - catalog: for centralized version management')
        logger.log('')
      }

      return allViolations
    },
    {
      failureMessage: 'Found link: dependencies (prohibited)',
      successMessage: 'No link: dependencies found',
    },
  )
}

main()
