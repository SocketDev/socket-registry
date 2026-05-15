/** @fileoverview Display GitHub Actions dependency tree showing direct and transitive dependencies. */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger'

const logger = getDefaultLogger()

import {
  ROOT_DOT_GITHUB_ACTIONS_PATH,
  ROOT_DOT_GITHUB_WORKFLOWS_PATH,
} from '../constants/paths.mts'

/**
 * Extract structured dependency information from a workflow or action file.
 */
export async function extractDependenciesWithStructure(filePath) {
  const content = await fs.readFile(filePath, 'utf8')
  const flatDependencies = new Set()
  const structuredDependencies = []

  // Extract dependencies from # Dependencies: comment blocks.
  const dependencyMatch = content.match(/^# Dependencies:\n((?:#.+\n)+)/m)
  if (dependencyMatch) {
    const lines = dependencyMatch[1].split('\n')
    let currentParent

    for (let i = 0, { length } = lines; i < length; i += 1) {
      const line = lines[i]
      // Match top-level dependencies (starting with #   -).
      const topLevelMatch = line.match(/^# {3}- (.+)$/)
      if (topLevelMatch) {
        let dep = topLevelMatch[1].trim()
        // Remove inline comments like "# transitive" or "# v5.0.0".
        dep = dep.replace(/\s+#.*$/, '')
        flatDependencies.add(dep)
        currentParent = { action: dep, transitives: [] }
        structuredDependencies.push(currentParent)
        continue
      }

      // Match transitive dependencies (starting with #     -).
      const transitiveMatch = line.match(/^# {5}- (.+)$/)
      if (transitiveMatch && currentParent) {
        let dep = transitiveMatch[1].trim()
        // Remove inline comments.
        dep = dep.replace(/\s+#.*$/, '')
        flatDependencies.add(dep)
        currentParent.transitives.push(dep)
      }
    }
  }

  // Also extract from uses: statements for completeness.
  const usesMatches = content.matchAll(/^\s*uses:\s*(.+)$/gm)
  for (let i = 0, { length } = usesMatches; i < length; i += 1) {
    const match = usesMatches[i]
    let action = match[1].trim()
    // Remove inline comments from uses statements.
    action = action.replace(/\s+#.*$/, '')
    // Skip local actions that reference the current repo.
    if (!action.startsWith('.')) {
      flatDependencies.add(action)
    }
  }

  return { flat: flatDependencies, structured: structuredDependencies }
}

/**
 * Recursively find all YAML files in a directory.
 */
export async function getAllYamlFiles(dir) {
  const files = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (let i = 0, { length } = entries; i < length; i += 1) {
      const entry = entries[i]
      const fullPath = path.join(dir, entry.name)
      if (entry.isFile() && entry.name.endsWith('.yml')) {
        files.push(fullPath)
      } else if (entry.isDirectory()) {
        // Recursively search subdirectories.

        files.push(...(await getAllYamlFiles(fullPath)))
      }
    }
  } catch {}
  return files
}

/**
 * Generate and display dependency tree for all GitHub Actions.
 */
async function main(): Promise<void> {
  const allDependencies = new Set()
  // Map of file -> structured dependencies.
  const dependencyTree = new Map()

  // Process workflow files.
  const workflowFiles = await getAllYamlFiles(ROOT_DOT_GITHUB_WORKFLOWS_PATH)
  for (let i = 0, { length } = workflowFiles; i < length; i += 1) {
    const file = workflowFiles[i]
    const { flat, structured } = await extractDependenciesWithStructure(file)
    for (let i = 0, { length } = flat; i < length; i += 1) {
      const dep = flat[i]
      allDependencies.add(dep)
    }
    if (structured.length > 0) {
      const relativePath = path.relative(process.cwd(), file)
      dependencyTree.set(relativePath, structured)
    }
  }

  // Process action files.
  const actionDirs = await fs.readdir(ROOT_DOT_GITHUB_ACTIONS_PATH, {
    withFileTypes: true,
  })
  for (let i = 0, { length } = actionDirs; i < length; i += 1) {
    const dir = actionDirs[i]
    if (dir.isDirectory()) {
      const actionFile = path.join(
        ROOT_DOT_GITHUB_ACTIONS_PATH,
        dir.name,
        'action.yml',
      )
      try {
        const { flat, structured } =
          await extractDependenciesWithStructure(actionFile)
        for (let i = 0, { length } = flat; i < length; i += 1) {
          const dep = flat[i]
          allDependencies.add(dep)
        }
        if (structured.length > 0) {
          const relativePath = path.relative(process.cwd(), actionFile)
          dependencyTree.set(relativePath, structured)
        }
      } catch {}
    }
  }

  // Generate the dependency tree.
  logger.log('# GitHub Actions Dependency Tree')
  logger.log('')

  // Sort files for consistent output.
  const sortedFiles = Array.from(dependencyTree.keys()).sort()
  // Base indentation for the entire tree.
  const indent = '  '

  for (let fileIndex = 0; fileIndex < sortedFiles.length; fileIndex++) {
    const file = sortedFiles[fileIndex]
    const dependencies = dependencyTree.get(file)
    if (dependencies.length > 0) {
      const isLastFile = fileIndex === sortedFiles.length - 1
      const filePrefix = isLastFile ? '└─' : '├─'
      const continuationPrefix = isLastFile ? '  ' : '│ '

      // Remove .github/ prefix for cleaner display.
      const cleanFile = file.replace(/^\.github\//, '')
      logger.log(`${indent}${filePrefix} ${cleanFile}`)

      for (let depIndex = 0; depIndex < dependencies.length; depIndex++) {
        const dep = dependencies[depIndex]
        const isLastDep = depIndex === dependencies.length - 1
        const depPrefix = isLastDep ? '└─' : '├─'

        logger.log(`${indent}${continuationPrefix} ${depPrefix} ${dep.action}`)

        for (
          let transIndex = 0;
          transIndex < dep.transitives.length;
          transIndex++
        ) {
          const transitive = dep.transitives[transIndex]
          const isLastTrans = transIndex === dep.transitives.length - 1
          const transPrefix = isLastTrans ? '└─' : '├─'
          const transContinuation = isLastDep ? '  ' : '│ '

          logger.log(
            `${indent}${continuationPrefix} ${transContinuation} ${transPrefix} ${transitive}`,
          )
        }
      }
    }
  }

  logger.log('')
  logger.info(`Total: ${allDependencies.size} unique actions/workflows`)
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
