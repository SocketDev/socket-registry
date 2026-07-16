/**
 * @file Validates package overrides before release to catch test infrastructure
 *   issues early.
 */

import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import parseArgsModule from '@socketsecurity/lib-stable/argv/parse'
import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import promisesModule from '@socketsecurity/lib-stable/promises/iterate'
import spawnModule from '@socketsecurity/lib-stable/process/spawn/child'
import { deleteAsync as del } from 'del'
import fastGlob from 'fast-glob'
import process from 'node:process'

import { NPM_PACKAGES_PATH } from '../constants/paths.mts'

interface CliArgs {
  package?: string[] | undefined
  concurrency: string
  verbose: boolean
  fix: boolean
}

const { parseArgs } = parseArgsModule
const logger = getDefaultLogger()
const { spawn } = spawnModule
const { pEach } = promisesModule

const { values: cliArgs } = parseArgs<CliArgs>({
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
  BUILD_ARTIFACTS: 'build-artifacts',
  DEPENDENCIES: 'dependencies',
  // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- validation-check id; this script validates target packages' real ESLint config, not the fleet's.
  ESLINT_CONFIG: 'eslint-config',
  MODULE_RESOLUTION: 'module-resolution',
  PACKAGE_JSON: 'package-json',
  TEST_FILES: 'test-files',
}

export interface ValidationIssue {
  type: string
  severity: string
  message: string
}

export interface ValidationResult {
  packageName: string
  issues: ValidationIssue[]
  hasErrors: boolean
  hasWarnings: boolean
}

function issueRecorder(
  issues: ValidationIssue[],
  type: string,
): (severity: string, message: string) => void {
  return (severity, message) => issues.push({ type, severity, message })
}

/**
 * Format validation results for display.
 */
export function formatResults(results: ValidationResult[]): {
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  for (let i = 0, { length } = results; i < length; i += 1) {
    const result = results[i]
    if (result === undefined) {
      continue
    }
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
export async function getPackagesToValidate(): Promise<string[]> {
  if (cliArgs.package?.length) {
    return cliArgs.package
  }

  const entries = await fs.readdir(NPM_PACKAGES_PATH, { withFileTypes: true })
  return entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => entry.name)
}

/**
 * Check for required build artifacts. Verifies that all entry points declared
 * in package.json actually exist.
 */
export async function validateBuildArtifacts(
  packageDir: string,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  const record = issueRecorder(issues, VALIDATION_CHECKS.BUILD_ARTIFACTS)
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
        const collectExports = (obj: Record<string, unknown>): void => {
          const values = Object.values(obj)
          for (let i = 0, { length } = values; i < length; i += 1) {
            const value = values[i]
            if (typeof value === 'string') {
              entryPoints.push(value)
            } else if (typeof value === 'object' && value !== null) {
              collectExports(value as Record<string, unknown>)
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
        record('error', `Entry point "${entryPoint}" does not exist`)
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
export async function validateDependencies(
  packageName: string,
  packageDir: string,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  const record = issueRecorder(issues, VALIDATION_CHECKS.DEPENDENCIES)
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
      record('error', `Dependency installation failed: ${installResult.stderr}`)
    }

    // Check for common missing modules.
    const nodeModulesPath = path.join(tempDir, 'node_modules')
    if (!existsSync(nodeModulesPath)) {
      record('error', 'node_modules directory not created after installation')
    }
  } catch (e) {
    record('error', `Dependency validation failed: ${errorMessage(e)}`)
  } finally {
    // Force delete temp directory outside CWD.
    await del(tempDir, { force: true })
  }

  return issues
}

/**
 * Check for ESLint configuration issues.
 */
export async function validateEslintConfig(
  packageDir: string,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  const record = issueRecorder(issues, VALIDATION_CHECKS.ESLINT_CONFIG)
  // Filenames of ESLint configs the validated package may ship. These are the
  // target package's files, not the fleet's tooling.
  // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- validates target packages' real ESLint config filenames.
  const eslintConfigNames = ['.eslintrc', '.eslintrc.js', '.eslintrc.json']

  const hasEslintConfig = eslintConfigNames.some(name =>
    existsSync(path.join(packageDir, name)),
  )

  if (hasEslintConfig) {
    try {
      // Try to validate ESLint config by running eslint --print-config.
      // oxlint-disable-next-line socket/no-eslint-biome-config-ref -- runs the validated package's own ESLint to verify its config, not the fleet's tooling.
      const result = await spawn('pnpm', ['eslint', '--print-config', '.'], {
        cwd: packageDir,
        stdio: 'pipe',
      })

      if (result.code !== 0) {
        record('error', `ESLint configuration is invalid: ${result.stderr}`)
      }
    } catch (e) {
      record('warning', `Could not validate ESLint config: ${errorMessage(e)}`)
    }
  }

  return issues
}

/**
 * Check for module resolution issues by analyzing imports. Scans all
 * JavaScript/TypeScript files for problematic import patterns that commonly
 * cause CI failures.
 */
export async function validateModuleResolution(
  packageDir: string,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  const record = issueRecorder(issues, VALIDATION_CHECKS.MODULE_RESOLUTION)

  try {
    const sourceFiles = await fastGlob(['**/*.{cjs,js,mjs,ts}'], {
      absolute: true,
      cwd: packageDir,
      ignore: ['**/node_modules/**'],
    })

    for (let i = 0, { length } = sourceFiles; i < length; i += 1) {
      const file = sourceFiles[i]
      if (file === undefined) {
        continue
      }
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
          record('error', `${message} in ${path.relative(packageDir, file)}`)
        }
      }
    }
  } catch (e) {
    record('warning', `Could not analyze module resolution: ${errorMessage(e)}`)
  }

  return issues
}

/**
 * Run all validations for a package.
 */
export async function validatePackage(
  packageName: string,
): Promise<ValidationResult> {
  const packageDir = path.join(NPM_PACKAGES_PATH, packageName)
  const allIssues: ValidationIssue[] = []

  if (cliArgs.verbose) {
    logger.info(`Validating ${packageName}...`)
  }

  // Run all validation checks.
  const validations = [
    validatePackageJson(packageDir),
    validateTestFiles(packageDir),
    validateModuleResolution(packageDir),
    validateBuildArtifacts(packageDir),
    validateEslintConfig(packageDir),
    validateDependencies(packageName, packageDir),
  ]

  const settled = await Promise.allSettled(validations)
  for (let i = 0, { length } = settled; i < length; i += 1) {
    const result = settled[i]
    if (result !== undefined && result.status === 'fulfilled') {
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
export async function validatePackageJson(
  packageDir: string,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  const record = issueRecorder(issues, VALIDATION_CHECKS.PACKAGE_JSON)
  const packageJsonPath = path.join(packageDir, 'package.json')

  if (!existsSync(packageJsonPath)) {
    record('error', 'package.json not found')
    return issues
  }

  try {
    const content = await fs.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(content)

    // Check for test script.
    if (!packageJson.scripts?.test) {
      record('warning', 'No test script defined in package.json')
    }

    // Check for required fields.
    if (!packageJson.name) {
      record('error', 'Missing "name" field in package.json')
    }

    if (!packageJson.version) {
      record('error', 'Missing "version" field in package.json')
    }
  } catch (e) {
    record('error', `Failed to parse package.json: ${errorMessage(e)}`)
  }

  return issues
}

/**
 * Check if test files exist and are in expected locations.
 */
export async function validateTestFiles(
  packageDir: string,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  const record = issueRecorder(issues, VALIDATION_CHECKS.TEST_FILES)
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
    if (testPath === undefined) {
      continue
    }
    const fullPath = path.join(packageDir, testPath)
    if (existsSync(fullPath)) {
      hasTests = true
      break
    }
  }

  if (!hasTests) {
    record('warning', 'No test directory or test files found')
  }

  return issues
}

/**
 * Main validation flow.
 */
async function main(): Promise<void> {
  logger.info('Starting package validation…')
  logger.error('')

  const packages = await getPackagesToValidate()
  logger.info(`Found ${packages.length} packages to validate`)
  logger.error('')

  const concurrency = Number.parseInt(cliArgs.concurrency, 10)
  const results: ValidationResult[] = []
  await pEach(
    packages,
    async (pkg: string) => {
      const result = await validatePackage(pkg)
      results.push(result)
    },
    { concurrency },
  )

  logger.error('')
  logger.info('--- Validation Results ---')
  logger.error('')
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
  logger.error(`Validation failed: ${errorMessage(e)}`)
  if (cliArgs.verbose) {
    logger.error(e instanceof Error ? e.stack : errorMessage(e))
  }
  process.exitCode = 1
})
