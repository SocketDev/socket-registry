/**
 * @fileoverview Post-build script to fix CommonJS exports compatibility using Babel AST and magic-string.
 *
 * WHY THIS SCRIPT IS STILL NEEDED:
 * =================================
 *
 * Even though we've converted most TypeScript files to use `export =` syntax for proper
 * CommonJS exports, this script is still necessary for the following reasons:
 *
 * 1. MIXED EXPORT FILES (Type + Value exports):
 *    Some files like ipc-handler.ts, ipc-object.ts, and packument-cache.ts export BOTH
 *    TypeScript types AND runtime values. TypeScript doesn't allow `export =` when there
 *    are other named exports (like type exports), so these files must use `export default`.
 *    This script converts their compiled `exports.default` to `module.exports`.
 *
 * 2. INDEX FILE AGGREGATION:
 *    The constants/index.ts file aggregates all constants into a single object. It uses
 *    a complex lazy-loading pattern that TypeScript compiles to `exports.default`. This
 *    script converts it to `module.exports` for proper CommonJS consumption.
 *
 * 3. IMPORT CLEANUP:
 *    When files are converted from `exports.default` to `module.exports`, any code that
 *    imports them with `.default` needs to be updated. This script automatically finds
 *    and fixes these imports throughout the codebase.
 *
 * 4. EXTERNAL MODULE COMPATIBILITY:
 *    Some external modules in subdirectories (like @npmcli/* or @socketregistry/*) may
 *    still compile to `exports.default` if they're not using `export =`. This script
 *    ensures they're properly converted for CommonJS compatibility.
 *
 * WHAT THIS SCRIPT DOES:
 * ======================
 * 1. Uses Babel to parse JavaScript files into AST
 * 2. Identifies `exports.default = value` patterns via AST traversal
 * 3. Uses magic-string for surgical string replacement without breaking source maps
 * 4. Removes unnecessary `__esModule` markers
 * 5. Tracks which modules were fixed
 * 6. Updates all imports to remove `.default` accessors for fixed modules
 * 7. Handles special cases like the constants index file
 *
 * WHEN THIS SCRIPT CAN BE REMOVED:
 * ================================
 * This script can be removed when ALL of the following conditions are met:
 * - All files use `export =` syntax (no mixed type/value exports)
 * - The constants index file is refactored to not need special handling
 * - All external modules properly export for CommonJS
 * - TypeScript compilation directly produces the desired CommonJS format
 */

import { promises as fs } from 'node:fs'
import { isBuiltin } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import MagicString from 'magic-string'

// Using dynamic imports to avoid ESLint n/no-extraneous-import errors.
// These packages are available during the build process.

const { parse } = await import('@babel/parser')

const traverseModule = await import('@babel/traverse')
const traverse = traverseModule.default

const t = await import('@babel/types')

import { logger } from './utils/logger.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const distDir = path.join(__dirname, '..', 'dist')
const constantsDir = path.join(distDir, 'lib', 'constants')

// Inline environment checks to avoid circular dependency during build.
const ENV = {
  CI: 'CI' in process.env,
  VERBOSE_BUILD: process.env.VERBOSE_BUILD === 'true',
}
const isDebug = () => !!process.env.DEBUG

// Files that MUST keep export default (currently none after separating types to .d.ts files).
// This was previously needed for files with mixed type/value exports, but we've now
// separated all type definitions into companion .d.ts files, allowing all .ts files
// to use `export =` for proper CommonJS output.
const KEEP_DEFAULT_EXPORT = new Set([
  // Currently empty - all constants can now use export =
])

// Track which modules were converted from exports.default to module.exports.
// This is crucial for the second pass where we fix imports - any code importing
// these modules needs to stop using .default accessor.
// Constants in lib/constants/
const fixedConstants = new Set()
// External modules in external/
const fixedExternals = new Set()
// Files that had their imports updated
const fixedImportFiles = new Set()

/**
 * Parse JavaScript code into AST using Babel.
 */
function parseCode(code) {
  return parse(code, {
    sourceType: 'module',
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
  })
}

/**
 * Check if AST node represents exports.default assignment.
 */
function isExportsDefaultAssignment(node) {
  return (
    t.isAssignmentExpression(node) &&
    t.isMemberExpression(node.left) &&
    t.isIdentifier(node.left.object, { name: 'exports' }) &&
    t.isIdentifier(node.left.property, { name: 'default' })
  )
}

/**
 * Check if AST node represents Object.defineProperty for __esModule.
 */
function isESModuleMarker(node) {
  return (
    t.isCallExpression(node) &&
    t.isMemberExpression(node.callee) &&
    t.isIdentifier(node.callee.object, { name: 'Object' }) &&
    t.isIdentifier(node.callee.property, { name: 'defineProperty' }) &&
    node.arguments.length >= 2 &&
    t.isIdentifier(node.arguments[0], { name: 'exports' }) &&
    t.isStringLiteral(node.arguments[1], { value: '__esModule' })
  )
}

/**
 * Fix a single file using AST transformation.
 */
async function fixFile(filePath) {
  const filename = path.basename(filePath)
  const dirname = path.basename(path.dirname(filePath))

  // Skip files that need to keep default export.
  if (KEEP_DEFAULT_EXPORT.has(filename)) {
    return
  }

  // Skip non-js files.
  if (!filename.endsWith('.js')) {
    return
  }

  const content = await fs.readFile(filePath, 'utf8')
  const magicString = new MagicString(content)

  // Special handling for constants/index.js which aggregates all constants.
  if (filename === 'index.js' && dirname === 'constants') {
    const searchStr = 'exports.default = (0, objects_1.createConstantsObject)'
    const replaceStr = 'module.exports = (0, objects_1.createConstantsObject)'
    const index = content.indexOf(searchStr)
    if (index !== -1) {
      magicString.overwrite(index, index + searchStr.length, replaceStr)
      await fs.writeFile(filePath, magicString.toString(), 'utf8')
      if (isDebug()) {
        logger.success(`Fixed CommonJS export for ${filename}`)
      }
      fixedConstants.add('index')
      return
    }
  }

  try {
    const ast = parseCode(content)
    let hasDefaultExport = false
    let hasOtherExports = false
    let modified = false
    const nodesToRemove = []

    // First pass: collect information about exports.
    traverse.default(ast, {
      AssignmentExpression(path) {
        const { node } = path
        if (isExportsDefaultAssignment(node)) {
          hasDefaultExport = true
        } else if (
          t.isMemberExpression(node.left) &&
          t.isIdentifier(node.left.object, { name: 'exports' }) &&
          !t.isIdentifier(node.left.property, { name: 'default' })
        ) {
          hasOtherExports = true
        }
      },
    })

    // Second pass: perform transformations if appropriate.
    if (hasDefaultExport && !hasOtherExports) {
      traverse.default(ast, {
        ExpressionStatement(path) {
          const { node } = path
          // Find exports.default = statements to replace.
          if (
            t.isAssignmentExpression(node.expression) &&
            isExportsDefaultAssignment(node.expression)
          ) {
            // Replace exports.default with module.exports.
            const start = node.start
            const exportsDefaultStr = 'exports.default'
            const index = content.indexOf(exportsDefaultStr, start)
            if (index !== -1) {
              magicString.overwrite(
                index,
                index + exportsDefaultStr.length,
                'module.exports',
              )
              modified = true
            }
          }
          // Find __esModule marker to remove.
          else if (
            t.isCallExpression(node.expression) &&
            isESModuleMarker(node.expression)
          ) {
            nodesToRemove.push(node)
          }
        },
      })
    }

    // Remove __esModule markers if we made modifications.
    if (modified) {
      // Remove __esModule markers.
      for (const node of nodesToRemove) {
        if (node.start !== null && node.end !== null) {
          // Include the trailing newline if present.
          let end = node.end
          if (content[end] === ';') {
            end += 1
          }
          if (content[end] === '\n') {
            end += 1
          }
          magicString.remove(node.start, end)
        }
      }

      await fs.writeFile(filePath, magicString.toString(), 'utf8')

      // Track that this module was fixed (remove .js extension).
      const moduleName = filename.replace('.js', '')

      // Track as constants or externals based on directory.
      if (dirname === 'constants') {
        fixedConstants.add(moduleName)
      } else if (dirname === 'external') {
        fixedExternals.add(moduleName)
      }

      if (isDebug()) {
        logger.success(`Fixed CommonJS export for ${dirname}/${filename}`)
      }
    }
  } catch (e) {
    // If parsing fails, skip this file.
    if (isDebug()) {
      logger.warn(`Could not parse ${filePath}: ${e.message}`)
    }
  }
}

/**
 * Fix imports in a file using AST transformation.
 */
async function fixImportsInFile(filePath, fixedConstants, fixedExternals) {
  const content = await fs.readFile(filePath, 'utf8')
  const magicString = new MagicString(content)
  let modified = false

  try {
    const ast = parseCode(content)

    traverse.default(ast, {
      CallExpression(path) {
        const { node } = path
        // Look for require() calls.
        if (t.isIdentifier(node.callee, { name: 'require' })) {
          const arg = node.arguments[0]
          if (t.isStringLiteral(arg)) {
            const modulePath = arg.value
            let moduleName = null

            // Check if this is a constants module.
            if (modulePath.includes('/constants/')) {
              const match = modulePath.match(/\/constants\/([^/]+)$/)
              if (match) {
                moduleName = match[1]
                if (fixedConstants.has(moduleName)) {
                  // Check if parent is accessing .default.
                  const parent = path.parent
                  if (
                    t.isMemberExpression(parent) &&
                    parent.object === node &&
                    t.isIdentifier(parent.property, { name: 'default' })
                  ) {
                    // Remove .default accessor.
                    // Include the dot.
                    const start = parent.property.start - 1
                    const end = parent.property.end
                    magicString.remove(start, end)
                    modified = true
                  }
                }
              }
            }
            // Check if this is an external module.
            else if (modulePath.includes('/external/')) {
              const match = modulePath.match(/\/external\/(.+)$/)
              if (match) {
                moduleName = match[1]
                if (fixedExternals.has(moduleName)) {
                  // Check if parent is accessing .default.
                  const parent = path.parent
                  if (
                    t.isMemberExpression(parent) &&
                    parent.object === node &&
                    t.isIdentifier(parent.property, { name: 'default' })
                  ) {
                    // Remove .default accessor.
                    // Include the dot.
                    const start = parent.property.start - 1
                    const end = parent.property.end
                    magicString.remove(start, end)
                    modified = true
                  }
                }
              }
            }
          }
        }
      },
      MemberExpression(path) {
        const { node } = path
        // Look for variable.default patterns (e.g., abort_controller_1.default, node_path_1.default).
        if (
          t.isIdentifier(node.object) &&
          t.isIdentifier(node.property, { name: 'default' }) &&
          /_\d+$/.test(node.object.name)
        ) {
          const varName = node.object.name
          // Search for the require statement for this variable.
          // Look in the entire file scope, not just function parent.
          let requirePath = null
          // Search through all variable declarations in the program.
          traverse.default(ast, {
            VariableDeclarator(declPath) {
              if (
                t.isIdentifier(declPath.node.id, { name: varName }) &&
                t.isCallExpression(declPath.node.init) &&
                t.isIdentifier(declPath.node.init.callee, {
                  name: 'require',
                }) &&
                t.isStringLiteral(declPath.node.init.arguments[0])
              ) {
                requirePath = declPath.node.init.arguments[0].value
                // Stop searching once found.
                declPath.stop()
              }
            },
          })

          if (requirePath) {
            // Check if this is a Node.js built-in module.
            const isNodeBuiltin = isBuiltin(requirePath)

            // Check if this module was fixed.
            // Handle both simple names and paths with hyphens.
            const moduleNameMatch = requirePath.match(/\/([^/]+)$/)
            let shouldFix = isNodeBuiltin

            if (!shouldFix && moduleNameMatch) {
              // Keep hyphens as-is.
              const moduleName = moduleNameMatch[1].replace(/-/g, '-')
              shouldFix =
                fixedConstants.has(moduleName) ||
                fixedExternals.has(moduleName) ||
                // Explicitly check for known problematic cases.
                fixedConstants.has('abort-controller')
            }

            if (shouldFix) {
              // Remove .default accessor.
              // Include the dot.
              const start = node.property.start - 1
              const end = node.property.end
              magicString.remove(start, end)
              modified = true
            }
          }
        }
      },
    })

    if (modified) {
      await fs.writeFile(filePath, magicString.toString(), 'utf8')
      fixedImportFiles.add(path.basename(filePath))
      if (isDebug()) {
        logger.success(`Fixed imports in ${path.basename(filePath)}`)
      }
    }
  } catch (e) {
    // If parsing fails, skip this file.
    if (isDebug()) {
      logger.warn(`Could not parse ${filePath}: ${e.message}`)
    }
  }
}

/**
 * Fix imports in all relevant files.
 */
async function fixAllImports(fixedConstants, fixedExternals) {
  // Fix imports in all JS files in dist/lib.
  const libDir = path.join(distDir, 'lib')
  const files = await fs.readdir(libDir)

  await Promise.all(
    files
      .filter(f => f.endsWith('.js'))
      .map(file =>
        fixImportsInFile(
          path.join(libDir, file),
          fixedConstants,
          fixedExternals,
        ),
      ),
  )

  // Also fix imports within the constants directory itself.
  const constantFiles = await fs.readdir(constantsDir)
  await Promise.all(
    constantFiles
      .filter(f => f.endsWith('.js'))
      .map(file =>
        fixImportsInFile(
          path.join(constantsDir, file),
          fixedConstants,
          fixedExternals,
        ),
      ),
  )

  // Also fix in dist/external if it exists.
  const externalDir = path.join(distDir, 'external')
  try {
    const externalFiles = await fs.readdir(externalDir)
    await Promise.all(
      externalFiles
        .filter(f => f.endsWith('.js'))
        .map(file =>
          fixImportsInFile(
            path.join(externalDir, file),
            fixedConstants,
            fixedExternals,
          ),
        ),
    )
  } catch {
    // External directory might not exist.
  }

  // Also fix in dist/index.js.
  const indexPath = path.join(distDir, 'index.js')
  try {
    await fs.access(indexPath)
    await fixImportsInFile(indexPath, fixedConstants, fixedExternals)
  } catch {
    // Index file might not exist.
  }
}

async function main() {
  try {
    const files = await fs.readdir(constantsDir)

    // First pass: fix exports.
    await Promise.all(files.map(file => fixFile(path.join(constantsDir, file))))

    // Check all constant files and add to fixedConstants set for import fixing.
    // We need this because constants might already be properly exported
    // from a previous run, but imports may still need fixing.
    for (const file of files) {
      if (file.endsWith('.js') && file !== 'index.js') {
        const filePath = path.join(constantsDir, file)
        // eslint-disable-next-line no-await-in-loop
        const content = await fs.readFile(filePath, 'utf8')
        // If the file uses module.exports, we should fix imports for it.
        if (content.includes('module.exports =')) {
          const moduleName = file.replace('.js', '')
          fixedConstants.add(moduleName)
        }
      }
    }

    // Also check external modules that might need import fixing.
    const externalSrcDir = path.join(path.dirname(distDir), 'src', 'external')
    try {
      const externalSrcFiles = await fs.readdir(externalSrcDir)
      for (const file of externalSrcFiles) {
        if (file.endsWith('.js')) {
          const moduleName = file.replace('.js', '')
          // Add to fixedExternals so imports get fixed.
          fixedExternals.add(moduleName)
        }
      }
      // Also check subdirectories.
      for (const subdir of ['@npmcli', '@socketregistry', '@yarnpkg']) {
        try {
          const subdirPath = path.join(externalSrcDir, subdir)
          // eslint-disable-next-line no-await-in-loop
          const subdirFiles = await fs.readdir(subdirPath)
          for (const file of subdirFiles) {
            if (file.endsWith('.js')) {
              fixedExternals.add(`${subdir}/${file.replace('.js', '')}`)
            }
          }
        } catch {
          // Subdirectory might not exist.
        }
      }
    } catch {
      // External directory might not exist.
    }

    // Debug: Show which constants need fixing.
    if (isDebug()) {
      logger.log('Constants that need import fixing:')
      fixedConstants.forEach(name => logger.log(`  - ${name}`))
    }

    // Also fix external wrappers that export default.
    const externalDir = path.join(distDir, 'external')
    try {
      const externalFiles = await fs.readdir(externalDir)
      await Promise.all(
        externalFiles
          .filter(f => f.endsWith('.js'))
          .map(file => fixFile(path.join(externalDir, file))),
      )
    } catch {
      // External directory might not exist.
    }

    // Second pass: fix imports that reference the fixed constants and external modules.
    if (fixedConstants.size || fixedExternals.size) {
      if (isDebug()) {
        logger.log(
          `\n📝 Fixing imports for ${fixedConstants.size} constants and ${fixedExternals.size} external modules...`,
        )
      }
      await fixAllImports(fixedConstants, fixedExternals)
    }

    // Show output in CI or when explicitly requested, otherwise be quiet during install-related lifecycle events.
    const lifecycleEvent = process.env.npm_lifecycle_event
    const isQuietLifecycle =
      lifecycleEvent &&
      (lifecycleEvent === 'prepare' || lifecycleEvent.includes('install'))
    const shouldShowOutput = ENV.CI || ENV.VERBOSE_BUILD || !isQuietLifecycle

    if (shouldShowOutput) {
      if (isDebug()) {
        if (fixedConstants.size) {
          logger.log('Fixed CJS exports in constants:')
          fixedConstants.forEach(n => logger.success(`  ${n}.js`))
        }
        if (fixedExternals.size) {
          logger.log('Fixed CJS exports in externals:')
          fixedExternals.forEach(n => logger.success(`  ${n}.js`))
        }
        if (fixedImportFiles.size) {
          logger.log('Fixed imports in files:')
          fixedImportFiles.forEach(n => logger.success(`  ${n}`))
        }
      } else {
        const totalFixed = fixedConstants.size + fixedExternals.size
        if (totalFixed) {
          logger.success(
            `Fixed CJS exports (${fixedConstants.size} constants, ${fixedExternals.size} externals)`,
          )
        }
        if (fixedImportFiles.size) {
          logger.success(`Fixed imports (${fixedImportFiles.size} files)`)
        }
      }
    }
  } catch (error) {
    logger.error('Error fixing CommonJS exports:', error)
    throw error
  }
}

main()
