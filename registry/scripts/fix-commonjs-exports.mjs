/**
 * @fileoverview Post-build script to fix CommonJS exports compatibility.
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
 * 1. Scans compiled JavaScript files for `exports.default = value` patterns
 * 2. Converts them to `module.exports = value` for direct CommonJS export
 * 3. Removes unnecessary `__esModule` markers
 * 4. Tracks which modules were fixed
 * 5. Updates all imports to remove `.default` accessors for fixed modules
 * 6. Handles special cases like the constants index file
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
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

  // Special handling for constants/index.js which aggregates all constants.
  // This file uses createConstantsObject() to build a lazy-loaded object of all constants.
  // TypeScript compiles this to exports.default but we need module.exports for CommonJS.
  if (filename === 'index.js') {
    let content = await fs.readFile(filePath, 'utf8')
    if (
      content.includes('exports.default = (0, objects_1.createConstantsObject)')
    ) {
      content = content.replace(
        'exports.default = (0, objects_1.createConstantsObject)',
        'module.exports = (0, objects_1.createConstantsObject)',
      )
      await fs.writeFile(filePath, content, 'utf8')
      if (isDebug()) {
        console.log(`✅ Fixed CommonJS export for ${filename}`)
      }
      fixedConstants.add('index')
    }
    return
  }

  let content = await fs.readFile(filePath, 'utf8')

  // CRITICAL CHECK: Only convert exports.default to module.exports if it's the ONLY export.
  // If there are other named exports (exports.foo, exports.bar), we can't use module.exports
  // as it would overwrite all other exports. This ensures we only convert files that
  // exclusively use default export.
  const hasDefaultExport = content.includes('exports.default =')
  const exportMatches = content.match(/exports\.\w+ =/g) || []
  const hasOnlyDefaultExport = hasDefaultExport && exportMatches.length === 1

  if (hasOnlyDefaultExport) {
    // Transform exports.default = value to module.exports = value.
    // Handle both single-line and multi-line exports.
    content = content.replace(
      /exports\.default = ([\s\S]+?);(?=\n|$)/,
      'module.exports = $1;',
    )

    // Remove the __esModule marker since we're doing direct CommonJS export.
    content = content.replace(
      /Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);\n/,
      '',
    )

    await fs.writeFile(filePath, content, 'utf8')

    // Track that this module was fixed (remove .js extension).
    const moduleName = filename.replace('.js', '')

    // Track as constants or externals based on directory.
    if (dirname === 'constants') {
      fixedConstants.add(moduleName)
    } else if (dirname === 'external') {
      fixedExternals.add(moduleName)
    }

    if (isDebug()) {
      console.log(`✅ Fixed CommonJS export for ${dirname}/${filename}`)
    }
  }
}

async function fixImportsInFile(filePath, fixedConstants, fixedExternals) {
  let content = await fs.readFile(filePath, 'utf8')
  let modified = false

  // Fix requires that use .default for fixed constants.
  // Handle multiline requires where the .default might be on a different line.
  for (const constantName of fixedConstants) {
    // Handle both ./constants/ and ../constants/ paths (for external files).
    // Use [\s\S] to match across line breaks and make the pattern work with multiline.
    const patterns = [
      new RegExp(
        `require\\('./constants/${constantName}'\\)[s]*\\.default`,
        'gs',
      ),
      new RegExp(
        `require\\('../lib/constants/${constantName}'\\)[s]*\\.default`,
        'gs',
      ),
      // Also handle imports within the constants directory itself.
      new RegExp(`require\\('./${constantName}'\\)[s]*\\.default`, 'gs'),
    ]

    for (const pattern of patterns) {
      if (content.match(pattern)) {
        content = content.replace(pattern, match => {
          // Remove the .default suffix but keep any whitespace before it.
          return match.replace(/\.default$/, '')
        })
        modified = true
      }
    }
  }

  // Also fix TypeScript's compiled variable references (e.g., abort_controller_1.default).
  // Match any _1, _2 etc. suffixed requires that use .default.
  const compiledVarPattern = /(\w+_\d+)\.default\b/g
  const matches = content.match(compiledVarPattern)
  if (matches) {
    // For each matched variable, check if it requires a fixed module.
    for (const match of matches) {
      const varName = match.replace('.default', '')
      // Find the require statement for this variable.
      const requirePattern = new RegExp(
        `const ${varName} = require\\("([^"]+)"\\)`,
      )
      const requireMatch = content.match(requirePattern)
      if (requireMatch) {
        const modulePath = requireMatch[1]
        // Check if this module was one we fixed.
        const moduleNameMatch = modulePath.match(/(?:^|\/)([^/]+)$/)
        if (moduleNameMatch) {
          const moduleName = moduleNameMatch[1]
          if (
            fixedConstants.has(moduleName) ||
            fixedExternals.has(moduleName)
          ) {
            // Replace all occurrences of varName.default with just varName.
            content = content.replace(
              new RegExp(`${varName}\\.default\\b`, 'g'),
              varName,
            )
            modified = true
          }
        }
      }
    }
  }

  // Fix requires that use .default for fixed external modules.
  for (const externalName of fixedExternals) {
    const patterns = [
      new RegExp(
        `require\\('./external/${externalName.replace('/', '\\/')}'\\)[s]*\\.default`,
        'gs',
      ),
      new RegExp(
        `require\\('../external/${externalName.replace('/', '\\/')}'\\)[s]*\\.default`,
        'gs',
      ),
      new RegExp(
        `require\\('../../external/${externalName.replace('/', '\\/')}'\\)[s]*\\.default`,
        'gs',
      ),
    ]

    for (const pattern of patterns) {
      if (content.match(pattern)) {
        content = content.replace(pattern, match => {
          // Remove the .default suffix but keep any whitespace before it.
          return match.replace(/\.default$/, '')
        })
        modified = true
      }
    }
  }

  if (modified) {
    await fs.writeFile(filePath, content, 'utf8')
    fixedImportFiles.add(path.basename(filePath))
    if (isDebug()) {
      console.log(`✅ Fixed imports in ${path.basename(filePath)}`)
    }
  }
}

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
  if (await fs.stat(indexPath).catch(() => false)) {
    await fixImportsInFile(indexPath, fixedConstants, fixedExternals)
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
        // If the file uses module.exports, we should fix imports for it
        if (content.includes('module.exports =')) {
          const moduleName = file.replace('.js', '')
          fixedConstants.add(moduleName)
        }
      }
    }

    // Also check external modules that might need import fixing
    const externalSrcDir = path.join(path.dirname(distDir), 'src', 'external')
    try {
      const externalSrcFiles = await fs.readdir(externalSrcDir)
      for (const file of externalSrcFiles) {
        if (file.endsWith('.js')) {
          const moduleName = file.replace('.js', '')
          // Add to fixedExternals so imports get fixed
          fixedExternals.add(moduleName)
        }
      }
      // Also check subdirectories
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
          // Subdirectory might not exist
        }
      }
    } catch {
      // External directory might not exist
    }

    // Debug: Show which constants need fixing
    if (isDebug()) {
      console.log('Constants that need import fixing:')
      fixedConstants.forEach(name => console.log(`  - ${name}`))
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
        console.log(
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
          console.log('Fixed CJS exports in constants:')
          fixedConstants.forEach(n => console.log(`  ✅ ${n}.js`))
        }
        if (fixedExternals.size) {
          console.log('Fixed CJS exports in externals:')
          fixedExternals.forEach(n => console.log(`  ✅ ${n}.js`))
        }
        if (fixedImportFiles.size) {
          console.log('Fixed imports in files:')
          fixedImportFiles.forEach(n => console.log(`  ✅ ${n}`))
        }
      } else {
        const totalFixed = fixedConstants.size + fixedExternals.size
        if (totalFixed) {
          console.log(
            `✅ Fixed CJS exports (${fixedConstants.size} constants, ${fixedExternals.size} externals)`,
          )
        }
        if (fixedImportFiles.size) {
          console.log(`✅ Fixed imports (${fixedImportFiles.size} files)`)
        }
      }
    }
  } catch (error) {
    console.error('Error fixing CommonJS exports:', error)
    throw error
  }
}

main()
