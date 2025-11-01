/**
 * @fileoverview Project synchronization utilities for CLAUDE.md files.
 * Handles syncing CLAUDE.md across Socket projects, maintaining socket-registry as canonical source.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import {
  prepareClaudeArgs,
  runCommand,
  runCommandWithOutput,
} from './command-execution.mjs'
import { log, parentPath, rootPath, SOCKET_PROJECTS } from './config.mjs'
import { runParallel, shouldRunParallel } from './parallel-execution.mjs'
import { printFooter, printHeader } from './utils/formatting.mjs'

/**
 * Commit changes in a project.
 */
async function commitChanges(project) {
  const { name, path: projectPath } = project

  log.progress(`Committing changes in ${name}`)

  // Check if there are changes to commit.
  const statusResult = await runCommandWithOutput(
    'git',
    ['status', '--porcelain', 'CLAUDE.md'],
    {
      cwd: projectPath,
    },
  )

  if (!statusResult.stdout.trim()) {
    log.done(`No changes in ${name}`)
    return true
  }

  // Stage the file.
  await runCommand('git', ['add', 'CLAUDE.md'], {
    cwd: projectPath,
    stdio: 'pipe',
  })

  // Commit with appropriate message.
  const message =
    name === 'socket-registry'
      ? 'Update CLAUDE.md as canonical source for cross-project standards'
      : 'Sync CLAUDE.md with canonical socket-registry standards'

  const commitResult = await runCommandWithOutput(
    'git',
    ['commit', '-m', message, '--no-verify'],
    {
      cwd: projectPath,
    },
  )

  if (commitResult.exitCode !== 0) {
    log.failed(`Failed to commit in ${name}`)
    return false
  }

  log.done(`Committed changes in ${name}`)
  return true
}

/**
 * Create a Claude prompt for syncing CLAUDE.md files.
 */
function createSyncPrompt(projectName, isRegistry = false) {
  if (isRegistry) {
    return `You are updating the CLAUDE.md file in the socket-registry project, which is the CANONICAL source for all cross-project Socket standards.

Your task:
1. Review the current CLAUDE.md in socket-registry
2. Identify any sections that should be the authoritative source for ALL Socket projects
3. Ensure these sections are clearly marked as "SHARED STANDARDS" or similar
4. Keep the content well-organized and comprehensive

The socket-registry/CLAUDE.md should contain:
- Cross-platform compatibility rules
- Node.js version requirements
- Safe file operations standards
- Git workflow standards
- Testing & coverage standards
- Package management standards
- Code style guidelines
- Error handling patterns
- Any other standards that apply to ALL Socket projects

Output ONLY the updated CLAUDE.md content, nothing else.`
  }

  return `You are updating the CLAUDE.md file in the ${projectName} project.

The socket-registry/CLAUDE.md is the CANONICAL source for all cross-project standards. Your task:

1. Read the canonical ../socket-registry/CLAUDE.md
2. Read the current CLAUDE.md in ${projectName}
3. Update ${projectName}/CLAUDE.md to:
   - Reference the canonical socket-registry/CLAUDE.md for all shared standards
   - Remove any redundant cross-project information that's already in socket-registry
   - Keep ONLY project-specific guidelines and requirements
   - Add a clear reference at the top pointing to socket-registry/CLAUDE.md as the canonical source

The ${projectName}/CLAUDE.md should contain:
- A reference to socket-registry/CLAUDE.md as the canonical source
- Project-specific architecture notes
- Project-specific commands and workflows
- Project-specific dependencies or requirements
- Any unique patterns or rules for this project only

Start the file with something like:
# CLAUDE.md

**CANONICAL REFERENCE**: See ../socket-registry/CLAUDE.md for shared Socket standards.

Then include only PROJECT-SPECIFIC content.

Output ONLY the updated CLAUDE.md content, nothing else.`
}

/**
 * Ensure .claude directory is in .gitignore.
 */
async function ensureClaudeInGitignore() {
  const gitignorePath = path.join(rootPath, '.gitignore')

  try {
    // Check if .gitignore exists.
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf8')
    const lines = gitignoreContent.split('\n')

    // Check if .claude is already ignored.
    const hasClaudeEntry = lines.some(line => {
      const trimmed = line.trim()
      return (
        trimmed === '.claude' ||
        trimmed === '/.claude' ||
        trimmed === '.claude/' ||
        trimmed === '/.claude/'
      )
    })

    if (!hasClaudeEntry) {
      // Add .claude to .gitignore.
      log.warn('.claude directory not in .gitignore, adding it')
      const updatedContent = `${gitignoreContent.trimEnd()}\n/.claude\n`
      await fs.writeFile(gitignorePath, updatedContent)
      log.done('Added /.claude to .gitignore')
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      // Create .gitignore with .claude entry.
      log.warn('No .gitignore found, creating one')
      await fs.writeFile(gitignorePath, '/.claude\n')
      log.done('Created .gitignore with /.claude entry')
    } else {
      log.error(`Failed to check .gitignore: ${e.message}`)
    }
  }
}

/**
 * Find Socket projects in parent directory.
 */
async function findSocketProjects() {
  const projects = []

  for (const projectName of SOCKET_PROJECTS) {
    const projectPath = path.join(parentPath, projectName)
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md')

    if (existsSync(projectPath) && existsSync(claudeMdPath)) {
      projects.push({
        claudeMdPath,
        name: projectName,
        path: projectPath,
      })
    }
  }

  return projects
}

/**
 * Sync CLAUDE.md files across Socket projects.
 */
async function syncClaudeMd(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('CLAUDE.md Synchronization')

  // Find Socket projects.
  log.progress('Finding Socket projects')
  const projects = await findSocketProjects()
  if (projects.length === 0) {
    log.failed('No Socket projects found')
    log.error('Expected projects in parent directory:')
    SOCKET_PROJECTS.forEach(p => {
      log.substep(path.join(parentPath, p))
    })
    return false
  }
  log.done(`Found ${projects.length} Socket projects`)

  // Process socket-registry first (it's the canonical source).
  log.step('Updating canonical source')
  const registryProject = projects.find(p => p.name === 'socket-registry')
  if (registryProject) {
    const success = await updateProjectClaudeMd(
      claudeCmd,
      registryProject,
      options,
    )
    if (!success && !opts['dry-run']) {
      log.error('Failed to update canonical socket-registry/CLAUDE.md')
      return false
    }
  }

  // Process other projects.
  log.step('Updating project-specific files')
  const otherProjects = projects.filter(p => p.name !== 'socket-registry')

  if (shouldRunParallel(opts) && otherProjects.length > 1) {
    // Run in parallel
    const tasks = otherProjects.map(project =>
      updateProjectClaudeMd(claudeCmd, project, options)
        .then(success => ({ project: project.name, success }))
        .catch(error => ({ error, project: project.name, success: false })),
    )

    const taskNames = projects.map(p => path.basename(p))
    const results = await runParallel(tasks, 'CLAUDE.md updates', taskNames)

    // Check for failures
    results.forEach(result => {
      if (
        result.status === 'fulfilled' &&
        !result.value.success &&
        !opts['dry-run']
      ) {
        log.error(`Failed to update ${result.value.project}/CLAUDE.md`)
      }
    })
  } else {
    // Run sequentially
    for (const project of otherProjects) {
      const success = await updateProjectClaudeMd(claudeCmd, project, options)
      if (!success && !opts['dry-run']) {
        log.error(`Failed to update ${project.name}/CLAUDE.md`)
        // Continue with other projects.
      }
    }
  }

  // Commit changes if not skipped.
  if (!opts['skip-commit'] && !opts['dry-run']) {
    log.step('Committing changes')

    if (shouldRunParallel(opts) && projects.length > 1) {
      // Run commits in parallel
      const tasks = projects.map(project => commitChanges(project))
      const taskNames = projects.map(p => path.basename(p))
      await runParallel(tasks, 'commits', taskNames)
    } else {
      // Run sequentially
      for (const project of projects) {
        await commitChanges(project)
      }
    }
  }

  // Push if requested.
  if (opts.push && !opts['dry-run']) {
    log.step('Pushing changes')

    if (shouldRunParallel(opts) && projects.length > 1) {
      // Run pushes in parallel
      const tasks = projects.map(project => {
        return runCommandWithOutput('git', ['push'], {
          cwd: project.path,
        })
          .then(pushResult => ({
            project: project.name,
            success: pushResult.exitCode === 0,
          }))
          .catch(error => ({
            error,
            project: project.name,
            success: false,
          }))
      })

      const results = await runParallel(tasks, 'pushes')

      // Report results
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          log.done(`Pushed ${result.value.project}`)
        } else {
          log.failed(`Failed to push ${result.value.project}`)
        }
      })
    } else {
      // Run sequentially
      for (const project of projects) {
        log.progress(`Pushing ${project.name}`)
        const pushResult = await runCommandWithOutput('git', ['push'], {
          cwd: project.path,
        })

        if (pushResult.exitCode === 0) {
          log.done(`Pushed ${project.name}`)
        } else {
          log.failed(`Failed to push ${project.name}`)
        }
      }
    }
  }

  printFooter('CLAUDE.md synchronization complete!')

  if (!opts['skip-commit'] && !opts['dry-run']) {
    log.info('\nNext steps:')
    if (!opts.push) {
      log.substep('Review changes with: git log --oneline -n 5')
      log.substep('Push to remote with: git push (in each project)')
    } else {
      log.substep('Changes have been pushed to remote repositories')
    }
  }

  return true
}

/**
 * Update a project's CLAUDE.md using Claude.
 */
async function updateProjectClaudeMd(claudeCmd, project, options = {}) {
  const _opts = { __proto__: null, ...options }
  const { claudeMdPath, name } = project
  const isRegistry = name === 'socket-registry'

  log.progress(`Updating ${name}/CLAUDE.md`)

  // Read current content.
  const currentContent = await fs.readFile(claudeMdPath, 'utf8')

  // Read canonical content if not registry.
  let canonicalContent = ''
  if (!isRegistry) {
    const canonicalPath = path.join(parentPath, 'socket-registry', 'CLAUDE.md')
    if (existsSync(canonicalPath)) {
      canonicalContent = await fs.readFile(canonicalPath, 'utf8')
    }
  }

  // Create the prompt.
  const prompt = createSyncPrompt(name, isRegistry)

  // Build full context for Claude.
  let fullPrompt = `${prompt}\n\n`

  if (!isRegistry && canonicalContent) {
    fullPrompt += `===== CANONICAL socket-registry/CLAUDE.md =====
${canonicalContent}

`
  }

  fullPrompt += `===== CURRENT ${name}/CLAUDE.md =====
${currentContent}

===== OUTPUT UPDATED ${name}/CLAUDE.md BELOW =====`

  // Call Claude to update the file.
  const result = await runCommandWithOutput(
    claudeCmd,
    prepareClaudeArgs([], options),
    {
      input: fullPrompt,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )

  if (result.exitCode !== 0) {
    log.failed(`Failed to update ${name}/CLAUDE.md`)
    return false
  }

  // Extract the updated content.
  const updatedContent = result.stdout.trim()

  // Write the updated file.
  await fs.writeFile(claudeMdPath, updatedContent)
  log.done(`Updated ${name}/CLAUDE.md`)

  return true
}

export {
  commitChanges,
  createSyncPrompt,
  ensureClaudeInGitignore,
  findSocketProjects,
  syncClaudeMd,
  updateProjectClaudeMd,
}
