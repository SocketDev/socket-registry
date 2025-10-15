/**
 * @fileoverview Analyze bundle contents to identify optimization opportunities.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function analyzeBundle(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  const fileName = path.basename(filePath)

  const analysis = {
    fileName,
    totalSize: content.length,
    lines: content.split('\n').length,

    // Identify wasteful patterns.
    patterns: {
      // Long error messages that could be shortened.
      longErrorMessages: (
        content.match(/Error\(['"`][^'"`]{200,}['"`]\)/g) || []
      ).map(m => m.length),

      // Embedded JSON data.
      embeddedJson: (
        content.match(/JSON\.parse\(['"`][\s\S]{500,}?['"`]\)/g) || []
      ).map(m => m.length),

      // Base64 encoded data.
      base64Data: (
        content.match(/['"`][A-Za-z0-9+/]{100,}={0,2}['"`]/g) || []
      ).map(m => m.length),

      // License headers and comments.
      licenseBlocks: (
        content.match(
          /\/\*[\s\S]*?(MIT|Apache|BSD|GPL|License)[\s\S]*?\*\//gi,
        ) || []
      ).map(m => m.length),

      // URLs in strings (docs, repos, etc).
      embeddedUrls: (content.match(/['"`]https?:\/\/[^'"`]+['"`]/g) || [])
        .length,

      // Debug/development code that might remain.
      debugCode: (content.match(/console\.(log|debug|trace|time)/g) || [])
        .length,
      assertCalls: (content.match(/assert[.(]/g) || []).length,

      // Template literals that might have large content.
      largeTemplates: (content.match(/`[^`]{500,}`/g) || []).map(m => m.length),

      // Repeated code patterns (potential for deduplication).
      duplicateRequires: {},

      // Package detection.
      packages: new Set(),
    },

    // Calculate waste.
    waste: {
      errorMessages: 0,
      embeddedData: 0,
      licensing: 0,
      debugging: 0,
    },
  }

  // Find duplicate requires.
  const requires = content.matchAll(/require\(['"`]([^'"`]+)['"`]\)/g)
  for (const match of requires) {
    const pkg = match[1]
    analysis.patterns.duplicateRequires[pkg] =
      (analysis.patterns.duplicateRequires[pkg] || 0) + 1
    if (!pkg.startsWith('.')) {
      analysis.patterns.packages.add(pkg)
    }
  }

  // Calculate wasted bytes.
  analysis.waste.errorMessages = analysis.patterns.longErrorMessages.reduce(
    (a, b) => a + b,
    0,
  )
  analysis.waste.embeddedData =
    analysis.patterns.embeddedJson.reduce((a, b) => a + b, 0) +
    analysis.patterns.base64Data.reduce((a, b) => a + b, 0) +
    analysis.patterns.largeTemplates.reduce((a, b) => a + b, 0)
  analysis.waste.licensing = analysis.patterns.licenseBlocks.reduce(
    (a, b) => a + b,
    0,
  )
  // Estimate 50 bytes per debug statement.
  analysis.waste.debugging =
    (analysis.patterns.debugCode + analysis.patterns.assertCalls) * 50

  analysis.totalWaste = Object.values(analysis.waste).reduce((a, b) => a + b, 0)
  analysis.potentialSavings = `${Math.round(analysis.totalWaste / 1024)}KB`
  analysis.savingsPercent = `${((analysis.totalWaste / analysis.totalSize) * 100).toFixed(1)}%`

  return analysis
}

async function main() {
  const distDir = path.join(__dirname, '..', 'dist', 'external')
  const files = await fs.readdir(distDir)

  // Get file sizes first, then sort
  const filesWithSizes = await Promise.all(
    files
      .filter(f => f.endsWith('.js'))
      .map(async f => ({
        name: f,
        size: (await fs.stat(path.join(distDir, f))).size,
      })),
  )

  const jsFiles = filesWithSizes
    .sort((a, b) => b.size - a.size)
    .map(f => f.name)

  console.log('🔍 Bundle Analysis Report\n')
  console.log('='.repeat(80))

  let totalOriginal = 0
  let totalWaste = 0

  // Analyze top 10 largest bundles.
  for (const file of jsFiles.slice(0, 10)) {
    const filePath = path.join(distDir, file)
    const analysis = await analyzeBundle(filePath)

    totalOriginal += analysis.totalSize
    totalWaste += analysis.totalWaste

    console.log(
      `\n📦 ${analysis.fileName} (${Math.round(analysis.totalSize / 1024)}KB)`,
    )
    console.log(
      '  Potential savings: ' +
        analysis.potentialSavings +
        ' (' +
        analysis.savingsPercent +
        ')',
    )

    if (analysis.patterns.longErrorMessages.length) {
      console.log(
        `  • Long error messages: ${analysis.patterns.longErrorMessages.length} occurrences`,
      )
    }
    if (analysis.patterns.embeddedJson.length) {
      console.log(
        `  • Embedded JSON: ${analysis.patterns.embeddedJson.length} blocks`,
      )
    }
    if (analysis.patterns.base64Data.length) {
      console.log(
        `  • Base64 data: ${analysis.patterns.base64Data.length} strings`,
      )
    }
    if (analysis.patterns.debugCode) {
      console.log(`  • Debug code: ${analysis.patterns.debugCode} statements`)
    }
    if (analysis.patterns.embeddedUrls) {
      console.log(
        `  • Embedded URLs: ${analysis.patterns.embeddedUrls} references`,
      )
    }

    // Show top duplicate requires.
    const duplicates = Object.entries(analysis.patterns.duplicateRequires)
      .filter(([_, count]) => count > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (duplicates.length) {
      console.log('  • Top duplicate requires:')
      duplicates.forEach(([pkg, count]) => {
        console.log(`    - ${pkg}: ${count} times`)
      })
    }
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log('📊 Summary:')
  console.log(`  Total size: ${Math.round(totalOriginal / 1024)}KB`)
  console.log(`  Total waste identified: ${Math.round(totalWaste / 1024)}KB`)
  console.log(
    `  Potential reduction: ${((totalWaste / totalOriginal) * 100).toFixed(1)}%`,
  )

  console.log('\n💡 Recommendations:')
  console.log('  1. Strip verbose error messages (keep error codes only)')
  console.log('  2. Externalize embedded JSON/base64 data')
  console.log('  3. Remove debug/assert statements')
  console.log('  4. Deduplicate common requires')
  console.log('  5. Use custom esbuild plugins for advanced stripping')
}

main().catch(console.error)
