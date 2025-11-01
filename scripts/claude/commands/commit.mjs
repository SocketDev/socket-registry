/**
 * @fileoverview Commit command for Claude CLI.
 * Provides Claude-assisted commit operations across projects.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import {
  SOCKET_PROJECTS,
  parentPath,
  rootPath,
} from '../config.mjs'
import {
  log,
  prepareClaudeArgs,
  printFooter,
  printHeader,
  runCommandWithOutput,
  runParallel,
  shouldRunParallel,
} from '../utils.mjs'

/**
 * Generate a commit message using Claude non-interactively.
 */
async function generateCommitMessage(claudeCmd, cwd, options = {}) {
  const opts = { __proto__: null, ...options }

  // Get git diff of staged changes
  const diffResult = await runCommandWithOutput('git', ['diff', '--cached'], {
    cwd,
  })

  // Get git status
  const statusResult = await runCommandWithOutput(
    'git',
    ['status', '--short'],
    { cwd },
  )

  // Get recent commit messages for style consistency
  const logResult = await runCommandWithOutput(
    'git',
    ['log', '--oneline', '-n', '5'],
    { cwd },
  )

  const prompt = `Generate a concise commit message for these changes.

Git status:
${statusResult.stdout || 'No status output'}

Git diff (staged changes):
${diffResult.stdout || 'No diff output'}

Recent commits (for style reference):
${logResult.stdout || 'No recent commits'}

Requirements:
1. Write a clear, concise commit message (1-2 lines preferred)
2. Follow the style of recent commits
3. Focus on WHY the changes were made, not just WHAT changed
4. NO AI attribution (per CLAUDE.md rules)
5. NO emojis
6. Output ONLY the commit message text, nothing else

Commit message:`

  // Run Claude non-interactively to generate commit message
  const result = await new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    const claudeProcess = spawn(claudeCmd, prepareClaudeArgs([], opts), {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    claudeProcess.stdout.on('data', data => {
      stdout += data.toString()
    })

    claudeProcess.stderr.on('data', data => {
      stderr += data.toString()
    })

    claudeProcess.on('close', code => {
      if (code === 0) {
        resolve(stdout.trim())
      } else {
        reject(
          new Error(
            `Claude failed to generate commit message: ${stderr || 'Unknown error'}`,
          ),
        )
      }
    })

    claudeProcess.stdin.write(prompt)
    claudeProcess.stdin.end()
  })

  // Extract just the commit message (Claude might add extra text)
  // Look for the actual message after "Commit message:" or just use the whole output
  const lines = result.split('\n').filter(line => line.trim())

  // Return the first substantial line that looks like a commit message
  for (const line of lines) {
    const trimmed = line.trim()
    // Skip common Claude preamble phrases
    if (
      trimmed &&
      !trimmed.toLowerCase().startsWith('here') &&
      !trimmed.toLowerCase().startsWith('commit message:') &&
      !trimmed.startsWith('```') &&
      trimmed.length > 10
    ) {
      return trimmed
    }
  }

  // Fallback to first non-empty line
  return lines[0] || 'Fix local checks and update tests'
}

/**
 * Run Claude-assisted commits across Socket projects.
 * Default: operates on current project only. Use --cross-repo for all Socket projects.
 * IMPORTANT: When running in parallel mode (--cross-repo), Claude agents run silently (stdio: 'pipe').
 * Interactive prompts would conflict if multiple agents needed user input simultaneously.
 * Use --seq flag if you need interactive debugging across multiple repos.
 */
async function runClaudeCommit(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Claude-Assisted Commit')

  // Find projects to commit in.
  log.step('Finding projects to commit')
  const projects = []

  if (!opts['cross-repo']) {
    // Default: Commit only in current project.
    const currentProjectName = path.basename(rootPath)
    projects.push({
      name: currentProjectName,
      path: rootPath,
    })
    log.info('Committing in current project only')
  } else {
    // With --cross-repo: Commit in all Socket projects with changes.
    for (const projectName of SOCKET_PROJECTS) {
      const projectPath = path.join(parentPath, projectName)
      if (existsSync(projectPath)) {
        // Check if project has changes.
        const statusResult = await runCommandWithOutput(
          'git',
          ['status', '--porcelain'],
          {
            cwd: projectPath,
          },
        )

        if (statusResult.stdout.trim()) {
          projects.push({
            changes: statusResult.stdout.trim(),
            name: projectName,
            path: projectPath,
          })
        }
      }
    }
  }

  if (projects.length === 0) {
    log.info('No projects with uncommitted changes found')
    return true
  }

  log.success(`Found ${projects.length} project(s) with changes`)

  // Process each project with changes.
  if (shouldRunParallel(opts) && projects.length > 1) {
    // Run commits in parallel
    const tasks = projects.map(project => {
      const commitTask = async () => {
        log.step(`Processing ${project.name}`)

        // Show current changes.
        if (project.changes) {
          log.substep('Changes detected:')
          const changeLines = project.changes.split('\n')
          changeLines.slice(0, 10).forEach(line => {
            log.substep(`  ${line}`)
          })
          if (changeLines.length > 10) {
            log.substep(`  ... and ${changeLines.length - 10} more`)
          }
        }

        // Build the commit prompt.
        let prompt = `You are in the ${project.name} project directory at ${project.path}.

Review the changes and create commits following these rules:
1. Commit changes
2. Create small, atomic commits
3. Follow claude.md rules for commit messages
4. NO AI attribution in commit messages
5. Use descriptive, concise commit messages`

        if (opts['no-verify']) {
          prompt += `
6. Use --no-verify flag when committing (git commit --no-verify)`
        }

        prompt += `

Check the current git status, review changes, and commit them appropriately.
Remember: small commits, follow project standards, no AI attribution.`

        log.progress(`Committing changes in ${project.name}`)

        // Launch Claude console for this project.
        const commitResult = await runCommandWithOutput(
          claudeCmd,
          prepareClaudeArgs([], options),
          {
            cwd: project.path,
            input: prompt,
            stdio: 'inherit',
          },
        )

        if (commitResult.exitCode === 0) {
          log.done(`Committed changes in ${project.name}`)
          return { project: project.name, success: true }
        }
        log.failed(`Failed to commit in ${project.name}`)
        return { project: project.name, success: false }
      }

      return commitTask()
    })

    await runParallel(tasks, 'commits')
  } else {
    // Run sequentially
    for (const project of projects) {
      log.step(`Processing ${project.name}`)

      // Show current changes.
      if (project.changes) {
        log.substep('Changes detected:')
        const changeLines = project.changes.split('\n')
        changeLines.slice(0, 10).forEach(line => {
          log.substep(`  ${line}`)
        })
        if (changeLines.length > 10) {
          log.substep(`  ... and ${changeLines.length - 10} more`)
        }
      }

      // Build the commit prompt.
      let prompt = `You are in the ${project.name} project directory at ${project.path}.

Review the changes and create commits following these rules:
1. Commit changes
2. Create small, atomic commits
3. Follow claude.md rules for commit messages
4. NO AI attribution in commit messages
5. Use descriptive, concise commit messages`

      if (opts['no-verify']) {
        prompt += `
6. Use --no-verify flag when committing (git commit --no-verify)`
      }

      prompt += `

Check the current git status, review changes, and commit them appropriately.
Remember: small commits, follow project standards, no AI attribution.`

      log.progress(`Committing changes in ${project.name}`)

      // Launch Claude console for this project.
      const commitResult = await runCommandWithOutput(
        claudeCmd,
        prepareClaudeArgs([], options),
        {
          cwd: project.path,
          input: prompt,
          stdio: 'inherit',
        },
      )

      if (commitResult.exitCode === 0) {
        log.done(`Committed changes in ${project.name}`)
      } else {
        log.failed(`Failed to commit in ${project.name}`)
      }
    }
  }

  // Optionally push changes.
  if (opts.push) {
    log.step('Pushing changes to remote')

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

  printFooter('Claude-assisted commits complete!')

  if (!opts.push) {
    log.info('\nNext steps:')
    log.substep('Review commits with: git log --oneline -n 5')
    log.substep('Push to remote with: git push (in each project)')
  }

  return true
}

export { generateCommitMessage, runClaudeCommit }
