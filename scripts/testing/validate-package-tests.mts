/* oxlint-disable socket/no-status-emoji -- intentional emoji output. */
/* oxlint-disable socket/prefer-cached-for-loop -- iterates destructured records and async-settled results; the cached-length rewrite would be incorrect. */

/** @fileoverview Validates package overrides before release to catch test infrastructure issues early. */

import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import parseArgsModule from '@socketsecurity/lib-stable/argv/parse'
import loggerModule from '@socketsecurity/lib-stable/logger'
import promisesModule from '@socketsecurity/lib-stable/promises'
import spawnModule from '@socketsecurity/lib-stable/spawn'

const { parseArgs } = parseArgsModule
const { logger } = loggerModule
const { spawn } = spawnModule
const { pEach } = promisesModule

import { deleteAsync as del } from 'del'
import process from 'node:process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PACKAGES_DIR = path.join(__dirname, '..', '..', 'packages', 'npm')

const { values: cliArgs } = parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    concurrency: {
      type: 'string',
      default: '5',
    },
    verbose: {
      type: 'boolean',
      default: false,
    },
    fix: {
      type: 'boolean',
      default: false,
    },
  },
  strict: false,
})

const VALIDATION_CHECKS = {
  MODULE_RESOLUTION: 'module-resolution',
  TEST_FILES: 'test-files',
  BUILD_ARTIFACTS: 'build-artifacts',
  ESLINT_CONFIG: 'eslint-config',
  DEPENDENCIES: 'dependencies',
  PACKAGE_JSON: 'package-json',
}

/**
 * Format validation results for display.
 */
export function formatResults(results) {
  const errors = []
  const warnings = []

  for (let i = 0, { length } = results; i < length; i += 1) {
    const result = results[i]
    if (!result.issues.length) {
      logger.success(`✓ ${result.packageName}: All checks passed`)
      continue
    }

    for (const issue of result.issues) {
      const message = `${result.packageName}: ${issue.message}`
      if (issue.severity === 'error') {
        errors.push(message)
        logger.error(`✗ ${message}`)
      } else {
        warnings.push(message)
        logger.warn(`⚠ ${message}`)
      }
    }
  }

  return { errors, warnings }
}

/**
 * Get list of package directories to validate.
 */
export async function getPackagesToValidate() {
  if (cliArgs.package?.length) {
    return cliArgs.package
  }

  const entries = await fs.readdir(PACKAGES_DIR, { withFileTypes: true })
  return entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => entry.name)
}

/**
 * Check for required build artifacts.
 * Verifies that all entry points declared in package.json actually exist.
 */
export async function validateBuildArtifacts(_packageName, packageDir) {
  const issues = []
  const packageJsonPath = path.join(packageDir, 'package.json')

  try {
    const content = await fs.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(content)

    // Collect all entry points from main and exports fields.
    const entryPoints = []
    if (packageJson.main) {
      entryPoints.push(packageJson.main)
    }
    if (packageJson.exports) {
      if (typeof packageJson.exports === 'string') {
        entryPoints.push(packageJson.exports)
      } else if (typeof packageJson.exports === 'object') {
        // Recursively extract string values from exports object structure.
        const collectExports = obj => {
          for (const value of Object.values(obj)) {
            if (typeof value === 'string') {
              entryPoints.push(value)
            } else if (typeof value === 'object' && value !== null) {
              collectExports(value)
            }
          }
        }
        collectExports(packageJson.exports)
      }
    }

    for (let i = 0, { length } = entryPoints; i < length; i += 1) {
      const entryPoint = entryPoints[i]
      const fullPath = path.join(packageDir, entryPoint)
      if (!existsSync(fullPath)) {
        issues.push({
          type: VALIDATION_CHECKS.BUILD_ARTIFACTS,
          severity: 'error',
          message: `Entry point "${entryPoint}" does not exist`,
        })
      }
    }
  } catch {
    // Already handled by validatePackageJson.
  }

  return issues
}

/**
 * Validate dependencies are properly installed in isolated environment.
 */
export async function validateDependencies(packageName, packageDir) {
  const issues = []
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `validate-${packageName}-`),
  )

  try {
    // Copy package to temp directory.
    await fs.cp(packageDir, tempDir, { recursive: true })

    // Install dependencies.
    const installResult = await spawn('pnpm', ['install', '--ignore-scripts'], {
      cwd: tempDir,
      stdio: 'pipe',
    })

    if (installResult.code !== 0) {
      issues.push({
        type: VALIDATION_CHECKS.DEPENDENCIES,
        severity: 'error',
        message: `Dependency installation failed: ${installResult.stderr}`,
      })
    }

    // Check for common missing modules.
    const nodeModulesPath = path.join(tempDir, 'node_modules')
    if (!existsSync(nodeModulesPath)) {
      issues.push({
        type: VALIDATION_CHECKS.DEPENDENCIES,
        severity: 'error',
        message: 'node_modules directory not created after installation',
      })
    }
  } catch (e) {
    issues.push({
      type: VALIDATION_CHECKS.DEPENDENCIES,
      severity: 'error',
      message: `Dependency validation failed: ${e.message}`,
    })
  } finally {
    // Force delete temp directory outside CWD.
    await del(tempDir, { force: true })
  }

  return issues
}

/**
 * Check for ESLint configuration issues.
 */
export async function validateEslintConfig(_packageName, packageDir) {
  const issues = []
  const eslintConfigPath = path.join(packageDir, '.eslintrc')
  const eslintConfigJsPath = path.join(packageDir, '.eslintrc.js')
  const eslintConfigJsonPath = path.join(packageDir, '.eslintrc.json')

  const hasEslintConfig =
    existsSync(eslintConfigPath) ||
    existsSync(eslintConfigJsPath) ||
    existsSync(eslintConfigJsonPath)

  if (hasEslintConfig) {
    try {
      // Try to validate ESLint config by running eslint --print-config.
      const result = await spawn('pnpm', ['eslint', '--print-config', '.'], {
        cwd: packageDir,
        stdio: 'pipe',
      })

      if (result.code !== 0) {
        issues.push({
          type: VALIDATION_CHECKS.ESLINT_CONFIG,
          severity: 'error',
          message: `ESLint configuration is invalid: ${result.stderr}`,
        })
      }
    } catch (e) {
      issues.push({
        type: VALIDATION_CHECKS.ESLINT_CONFIG,
        severity: 'warning',
        message: `Could not validate ESLint config: ${e.message}`,
      })
    }
  }

  return issues
}

/**
 * Check for module resolution issues by analyzing imports.
 * Scans all JavaScript/TypeScript files for problematic import patterns
 * that commonly cause CI failures.
 */
export async function validateModuleResolution(_packageName, packageDir) {
  const issues = []

  // Collect all source files recursively.
  const sourceFiles = []
  const collectFiles = async dir => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (let i = 0, { length } = entries; i < length; i += 1) {
      const entry = entries[i]
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        // Recursively scan subdirectories, excluding node_modules.

        await collectFiles(fullPath)
      } else if (entry.isFile() && /\.(cjs|js|mjs|ts)$/.test(entry.name)) {
        sourceFiles.push(fullPath)
      }
    }
  }

  try {
    await collectFiles(packageDir)

    for (let i = 0, { length } = sourceFiles; i < length; i += 1) {
      const file = sourceFiles[i]
      const content = await fs.readFile(file, 'utf8')

      // Check for problematic import patterns.
      const problematicPatterns = [
        {
          pattern: /require\(['"]\.\.\/\.\.\/node_modules/,
          message: 'Relative path traversal to node_modules detected',
        },
        {
          pattern: /from ['"]\.\.\/\.\.\/node_modules/,
          message: 'Import with relative path traversal to node_modules',
        },
        {
          pattern: /require\(['"][^'"]*\.pnpm[^'"]*['"]\)/,
          message: 'Direct .pnpm directory reference detected',
        },
      ]

      for (const { message, pattern } of problematicPatterns) {
        if (pattern.test(content)) {
          issues.push({
            type: VALIDATION_CHECKS.MODULE_RESOLUTION,
            severity: 'error',
            message: `${message} in ${path.relative(packageDir, file)}`,
          })
        }
      }
    }
  } catch (e) {
    issues.push({
      type: VALIDATION_CHECKS.MODULE_RESOLUTION,
      severity: 'warning',
      message: `Could not analyze module resolution: ${e.message}`,
    })
  }

  return issues
}

/**
 * Run all validations for a package.
 */
export async function validatePackage(packageName) {
  const packageDir = path.join(PACKAGES_DIR, packageName)
  const allIssues = []

  if (cliArgs.verbose) {
    logger.info(`Validating ${packageName}...`)
  }

  // Run all validation checks.
  const validations = [
    validatePackageJson(packageName, packageDir),
    validateTestFiles(packageName, packageDir),
    validateModuleResolution(packageName, packageDir),
    validateBuildArtifacts(packageName, packageDir),
    validateEslintConfig(packageName, packageDir),
    validateDependencies(packageName, packageDir),
  ]

  const settled = await Promise.allSettled(validations)
  for (let i = 0, { length } = settled; i < length; i += 1) {
    const result = settled[i]
    if (result.status === 'fulfilled') {
      allIssues.push(...result.value)
    }
  }

  return {
    packageName,
    issues: allIssues,
    hasErrors: allIssues.some(issue => issue.severity === 'error'),
    hasWarnings: allIssues.some(issue => issue.severity === 'warning'),
  }
}

/**
 * Check if package.json exists and is valid.
 */
export async function validatePackageJson(_packageName, packageDir) {
  const issues = []
  const packageJsonPath = path.join(packageDir, 'package.json')

  if (!existsSync(packageJsonPath)) {
    issues.push({
      type: VALIDATION_CHECKS.PACKAGE_JSON,
      severity: 'error',
      message: 'package.json not found',
    })
    return issues
  }

  try {
    const content = await fs.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(content)

    // Check for test script.
    if (!packageJson.scripts?.test) {
      issues.push({
        type: VALIDATION_CHECKS.PACKAGE_JSON,
        severity: 'warning',
        message: 'No test script defined in package.json',
      })
    }

    // Check for required fields.
    if (!packageJson.name) {
      issues.push({
        type: VALIDATION_CHECKS.PACKAGE_JSON,
        severity: 'error',
        message: 'Missing "name" field in package.json',
      })
    }

    if (!packageJson.version) {
      issues.push({
        type: VALIDATION_CHECKS.PACKAGE_JSON,
        severity: 'error',
        message: 'Missing "version" field in package.json',
      })
    }
  } catch (e) {
    issues.push({
      type: VALIDATION_CHECKS.PACKAGE_JSON,
      severity: 'error',
      message: `Failed to parse package.json: ${e.message}`,
    })
  }

  return issues
}

/**
 * Check if test files exist and are in expected locations.
 */
export async function validateTestFiles(_packageName, packageDir) {
  const issues = []
  const commonTestPaths = [
    'test',
    'tests',
    '__tests__',
    'spec',
    'test.js',
    'test.mjs',
    'test.cjs',
    'tests.js',
  ]

  let hasTests = false
  for (let i = 0, { length } = commonTestPaths; i < length; i += 1) {
    const testPath = commonTestPaths[i]
    const fullPath = path.join(packageDir, testPath)
    if (existsSync(fullPath)) {
      hasTests = true
      break
    }
  }

  if (!hasTests) {
    issues.push({
      type: VALIDATION_CHECKS.TEST_FILES,
      severity: 'warning',
      message: 'No test directory or test files found',
    })
  }

  return issues
}

/**
 * Main validation flow.
 */
async function main(): Promise<void> {
  logger.info('Starting package validation...')
  logger.error('')

  const packages = await getPackagesToValidate()
  logger.info(`Found ${packages.length} packages to validate`)
  logger.error('')

  const concurrency = Number.parseInt(cliArgs.concurrency, 10)
  const results = []
  await pEach(
    packages,
    async pkg => {
      const result = await validatePackage(pkg)
      results.push(result)
    },
    { concurrency },
  )

  logger.error('')
  logger.info('--- Validation Results ---\n')
  const { errors, warnings } = formatResults(results)

  logger.error('')
  logger.info('--- Summary ---')
  logger.info(`Total packages: ${packages.length}`)
  logger.info(`Passed: ${results.filter(r => !r.issues.length).length}`)
  logger.info(
    `With warnings: ${results.filter(r => r.hasWarnings && !r.hasErrors).length}`,
  )
  logger.info(`With errors: ${results.filter(r => r.hasErrors).length}`)

  if (errors.length > 0) {
    logger.error('')
    logger.error(`${errors.length} error(s) found`)
    process.exitCode = 1
  } else if (warnings.length > 0) {
    logger.error('')
    logger.warn(`${warnings.length} warning(s) found`)
  } else {
    logger.error('')
    logger.success('✓ All packages validated successfully!')
  }
}

main().catch((e: unknown) => {
  logger.error(`Validation failed: ${e.message}`)
  if (cliArgs.verbose) {
    logger.error(e.stack)
  }
  process.exitCode = 1
})
