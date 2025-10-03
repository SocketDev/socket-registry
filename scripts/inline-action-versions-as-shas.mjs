/** @fileoverview Convert GitHub Actions tags/branches to commit SHAs in workflow files. */

import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { resolveRefToSha } from '../registry/dist/lib/github.js'
import { logger } from '../registry/dist/lib/logger.js'
import constants from './constants.mjs'

/**
 * Extract dependencies from the Dependencies comment block.
 */
function extractDependencies(content) {
  const dependencies = []

  // Extract dependencies from # Dependencies: comment blocks.
  const dependencyMatch = content.match(/^# Dependencies:\n((?:#.+\n)+)/m)
  if (!dependencyMatch) {
    return dependencies
  }

  const lines = dependencyMatch[1].split('\n')
  for (const line of lines) {
    // Match dependency format: #   - owner/repo@ref or #   - owner/repo/.github/path@ref
    // If @ref is omitted, defaults to @main
    const depMatch = line.match(/^#\s+-\s+([^/\s]+)\/([^@\s#]+)(?:@([^\s#]+))?/)
    if (depMatch) {
      const [, owner, repoPath, ref = 'main'] = depMatch
      // May include .github/workflows/name or .github/actions/name.
      dependencies.push({
        owner,
        ref,
        repoPath,
      })
    }
  }

  return dependencies
}

/**
 * Extract uses statements and their positions in the file.
 */
function extractUsesStatements(content) {
  const statements = []
  const usesRegex = /^(\s*)uses:\s*([^/\s]+)\/([^@\s]+)@([^\s#]+)(\s*#.*)?$/gm

  let match
  while ((match = usesRegex.exec(content)) !== null) {
    const [fullMatch, indent, owner, repoPath, ref, comment] = match
    statements.push({
      comment: comment?.trim() || '',
      fullMatch,
      indent,
      owner,
      ref,
      repoPath,
    })
  }

  return statements
}

/**
 * Process a single file and update action references.
 */
async function processFile(filePath, token, dryRun) {
  const content = await fs.readFile(filePath, 'utf8')
  const dependencies = extractDependencies(content)

  if (dependencies.length === 0) {
    return { hasChanges: false }
  }

  // Build a map of dependencies with their resolved SHAs.
  const depMap = new Map()

  for (const dep of dependencies) {
    const { owner, ref, repoPath } = dep

    // Extract just the repo name (first part before any slashes in repoPath).
    const repo = repoPath.split('/')[0]

    try {
      // eslint-disable-next-line no-await-in-loop
      const sha = await resolveRefToSha(owner, repo, ref, { token })
      depMap.set(`${owner}/${repoPath}@${ref}`, { owner, ref, repoPath, sha })
    } catch (e) {
      logger.error(
        `Failed to resolve ${owner}/${repoPath}@${ref}: ${e.message}`,
      )
    }
  }

  if (depMap.size === 0) {
    return { hasChanges: false }
  }

  // Now update uses statements based on resolved dependencies.
  const usesStatements = extractUsesStatements(content)
  let updatedContent = content
  const changes = []

  // Process in reverse order to maintain correct string positions.
  for (const stmt of usesStatements.toReversed()) {
    const { fullMatch, indent, owner, ref: currentRef, repoPath } = stmt

    // Skip if already using a SHA (40-character hex string).
    if (/^[0-9a-f]{40}$/i.test(currentRef)) {
      continue
    }

    // Find matching dependency.
    const depKey = `${owner}/${repoPath}@${currentRef}`
    const dep = depMap.get(depKey)

    if (!dep) {
      continue
    }

    const { ref: originalRef, sha } = dep
    const newLine = `${indent}uses: ${owner}/${repoPath}@${sha} # ${originalRef}`

    updatedContent = updatedContent.replace(fullMatch, newLine)
    changes.push({
      action: `${owner}/${repoPath}`,
      newLine,
      oldLine: fullMatch.trim(),
      ref: originalRef,
      sha,
    })
  }

  if (changes.length > 0) {
    if (!dryRun) {
      await fs.writeFile(filePath, updatedContent, 'utf8')
    }
    return { changes, hasChanges: true }
  }

  return { hasChanges: false }
}

/**
 * Recursively find all YAML files in a directory.
 */
async function getAllYamlFiles(dir) {
  const files = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isFile() && entry.name.endsWith('.yml')) {
        files.push(fullPath)
      } else if (entry.isDirectory()) {
        // eslint-disable-next-line no-await-in-loop
        files.push(...(await getAllYamlFiles(fullPath)))
      }
    }
  } catch {}
  return files
}

/**
 * Main function to process all workflow and action files.
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const token = process.env.GITHUB_TOKEN || ''

  // Parse --cwd argument.
  const cwdIndex = args.indexOf('--cwd')
  const cwd =
    cwdIndex >= 0 && args[cwdIndex + 1]
      ? path.resolve(args[cwdIndex + 1])
      : constants.rootPath

  if (!token) {
    logger.warn(
      'No GITHUB_TOKEN found. GitHub API rate limit is 60 requests/hour without authentication.',
    )
    logger.warn(
      'Set GITHUB_TOKEN environment variable to increase limit to 5000 requests/hour.',
    )
  }

  if (dryRun) {
    logger.info('Running in dry-run mode - no files will be modified')
  }

  if (cwd !== constants.rootPath) {
    logger.info(`Working directory: ${cwd}`)
  }

  const dotGithubPath = path.join(cwd, '.github')
  const workflowsPath = path.join(dotGithubPath, 'workflows')
  const actionsPath = path.join(dotGithubPath, 'actions')

  // Validate paths exist.
  if (!existsSync(dotGithubPath)) {
    logger.fail(`Directory not found: ${dotGithubPath}`)
    throw new Error(`Directory not found: ${dotGithubPath}`)
  }

  const hasWorkflows = existsSync(workflowsPath)
  const hasActions = existsSync(actionsPath)

  if (!hasWorkflows && !hasActions) {
    logger.fail(
      `Neither workflows nor actions directories found in ${dotGithubPath}`,
    )
    throw new Error(
      `Neither workflows nor actions directories found in ${dotGithubPath}`,
    )
  }

  const allFiles = []

  // Collect workflow files.
  const workflowFiles = await getAllYamlFiles(workflowsPath)
  allFiles.push(...workflowFiles)

  // Collect action files.
  try {
    const actionDirs = await fs.readdir(actionsPath, { withFileTypes: true })
    for (const dir of actionDirs) {
      if (dir.isDirectory()) {
        const actionFile = path.join(actionsPath, dir.name, 'action.yml')
        try {
          // eslint-disable-next-line no-await-in-loop
          await fs.access(actionFile)
          allFiles.push(actionFile)
        } catch {}
      }
    }
  } catch {}

  if (allFiles.length === 0) {
    logger.warn('No workflow or action files found')
    return
  }

  logger.info(`Processing ${allFiles.length} files...`)

  let totalChanges = 0
  const processedFiles = []

  for (const file of allFiles) {
    // eslint-disable-next-line no-await-in-loop
    const result = await processFile(file, token, dryRun)
    if (result.hasChanges) {
      processedFiles.push({ changes: result.changes, file })
      totalChanges += result.changes.length
    }
  }

  if (processedFiles.length === 0) {
    logger.success('All actions are already using commit SHAs')
    return
  }

  // Display changes.
  for (const { changes, file } of processedFiles) {
    logger.info(`\n${path.relative(cwd, file)}:`)
    for (const change of changes) {
      logger.log(`  ${change.action}@${change.ref} → ${change.sha.slice(0, 7)}`)
      if (!dryRun) {
        logger.log(`    - ${change.oldLine}`)
        logger.log(`    + ${change.newLine.trim()}`)
      }
    }
  }

  logger.info(
    `\nTotal: ${totalChanges} actions updated in ${processedFiles.length} files`,
  )

  if (dryRun) {
    logger.info('\nRun without --dry-run to apply changes')
  } else {
    logger.success('\nAll actions have been updated to use commit SHAs')
  }
}

main().catch(console.error)
