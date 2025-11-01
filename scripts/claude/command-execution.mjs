/**
 * @fileoverview Command execution utilities.
 * Provides functions for running commands and Claude Code CLI.
 */

import { spawn } from 'node:child_process'

import { log, rootPath, WIN32 } from './config.mjs'
import { modelStrategy } from './model-strategy.mjs'

// Simple cache for Claude responses with automatic cleanup
const claudeCache = new Map()
// 5 minutes
const CACHE_TTL = 5 * 60 * 1000

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of claudeCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      claudeCache.delete(key)
    }
  }
  // unref() allows process to exit if this is the only timer.
}, CACHE_TTL).unref()

function prepareClaudeArgs(args = [], options = {}) {
  const _opts = { __proto__: null, ...options }
  const claudeArgs = [...args]

  // Smart model selection.
  const task = _opts.prompt || _opts.command || 'general task'
  const forceModel = _opts['the-brain']
    ? 'the-brain'
    : _opts.pinky
      ? 'pinky'
      : null

  const mode = modelStrategy.selectMode(task, {
    forceModel,
    lastError: _opts.lastError,
  })

  const model = modelStrategy.selectModel(task, {
    forceModel,
    lastError: _opts.lastError,
  })

  // Track mode for caching and logging.
  _opts._selectedMode = mode
  _opts._selectedModel = model

  // Add --dangerously-skip-permissions unless --no-darkwing is specified
  // "Let's get dangerous!" mode for automated CI fixes
  if (!_opts['no-darkwing']) {
    claudeArgs.push('--dangerously-skip-permissions')
  }

  return claudeArgs
}

/**
 * Run Claude Code with a prompt.
 * Handles caching, model tracking, and retry logic.
 */
async function runClaude(claudeCmd, prompt, options = {}) {
  const opts = { __proto__: null, ...options }
  const args = prepareClaudeArgs([], opts)

  // Determine mode for ultrathink decision.
  const task = prompt.slice(0, 100)
  const forceModel = opts['the-brain']
    ? 'the-brain'
    : opts.pinky
      ? 'pinky'
      : null
  const mode = modelStrategy.selectMode(task, {
    forceModel,
    lastError: opts.lastError,
  })

  // Prepend ultrathink directive when using The Brain mode.
  // Ultrathink is Claude's most intensive thinking mode, providing maximum
  // thinking budget for deep analysis and complex problem-solving.
  // Learn more: https://www.anthropic.com/engineering/claude-code-best-practices
  let enhancedPrompt = prompt
  if (mode === 'the-brain') {
    enhancedPrompt = `ultrathink\n\n${prompt}`
    log.substep('🧠 The Brain activated with ultrathink mode')
  }

  // Check cache for non-interactive requests
  if (opts.interactive === false && opts.cache !== false) {
    const cacheKey = `${enhancedPrompt.slice(0, 100)}_${mode}`
    const cached = claudeCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      log.substep('📦 Using cached response')
      return cached.result
    }
  }

  let result

  // Default timeout: 3 minutes for non-interactive, 10 minutes for interactive
  const timeout =
    opts.timeout || (opts.interactive === false ? 180_000 : 600_000)
  const showProgress = opts.showProgress !== false && opts.interactive === false
  const startTime = Date.now()
  let progressInterval = null
  let timedOut = false

  try {
    if (opts.interactive !== false) {
      // Interactive mode - spawn with inherited stdio and pipe prompt
      result = await new Promise((resolve, _reject) => {
        const child = spawn(claudeCmd, args, {
          cwd: opts.cwd || rootPath,
          stdio: ['pipe', 'inherit', 'inherit'],
          ...(WIN32 && { shell: true }),
        })

        // Set up timeout for interactive mode
        const timeoutId = setTimeout(() => {
          timedOut = true
          log.warn(
            `Claude interactive session timed out after ${Math.round(timeout / 1000)}s`,
          )
          child.kill()
          resolve(1)
        }, timeout)

        // Write the prompt to stdin
        if (enhancedPrompt) {
          child.stdin.write(enhancedPrompt)
          child.stdin.end()
        }

        child.on('exit', code => {
          clearTimeout(timeoutId)
          resolve(code || 0)
        })

        child.on('error', () => {
          clearTimeout(timeoutId)
          resolve(1)
        })
      })
    } else {
      // Non-interactive mode - capture output with progress

      // Show initial progress if enabled
      if (showProgress && !opts.silent) {
        log.progress('Claude analyzing...')

        // Set up progress interval
        progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime
          if (elapsed > timeout) {
            timedOut = true
            log.warn(`Claude timed out after ${Math.round(elapsed / 1000)}s`)
            if (progressInterval) {
              clearInterval(progressInterval)
              progressInterval = null
            }
          } else {
            log.progress(
              `Claude processing... (${Math.round(elapsed / 1000)}s)`,
            )
          }
          // Update every 10 seconds.
        }, 10_000)
      }

      // Run command with timeout
      result = await Promise.race([
        runCommandWithOutput(claudeCmd, args, {
          ...opts,
          input: enhancedPrompt,
          stdio: ['pipe', 'pipe', 'pipe'],
        }),
        new Promise(resolve => {
          setTimeout(() => {
            if (!timedOut) {
              timedOut = true
              resolve({
                exitCode: 1,
                stderr: 'Operation timed out',
                stdout: '',
              })
            }
          }, timeout)
        }),
      ])

      // Clear progress interval
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
        if (!opts.silent && !timedOut) {
          const elapsed = Date.now() - startTime
          log.done(`Claude completed in ${Math.round(elapsed / 1000)}s`)
        }
      }

      // Cache the result
      if (opts.cache !== false && result.exitCode === 0 && !timedOut) {
        const cacheKey = `${prompt.slice(0, 100)}_${opts._selectedModel || 'default'}`
        claudeCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
        })
      }
    }

    // Record success for model strategy
    modelStrategy.recordAttempt(task, true)

    return result
  } catch (error) {
    // Record failure for potential escalation
    modelStrategy.recordAttempt(task, false)

    // Check if we should retry with Brain
    const attempts = modelStrategy.attempts.get(modelStrategy.getTaskKey(task))
    if (attempts === modelStrategy.escalationThreshold && !opts['the-brain']) {
      log.warn('🧠 Pinky failed, escalating to The Brain...')
      opts['the-brain'] = true
      return runClaude(claudeCmd, prompt, opts)
    }

    throw error
  }
}

async function runCommand(command, args = [], options = {}) {
  const opts = { __proto__: null, ...options }
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootPath,
      stdio: 'inherit',
      ...(WIN32 && { shell: true }),
      ...opts,
    })

    child.on('exit', code => {
      resolve(code || 0)
    })

    child.on('error', error => {
      reject(error)
    })
  })
}

async function runCommandWithOutput(command, args = [], options = {}) {
  const opts = { __proto__: null, ...options }
  const { input, ...spawnOpts } = opts

  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    const child = spawn(command, args, {
      cwd: rootPath,
      ...(WIN32 && { shell: true }),
      ...spawnOpts,
    })

    // Write input to stdin if provided.
    if (input && child.stdin) {
      child.stdin.write(input)
      child.stdin.end()
    }

    if (child.stdout) {
      child.stdout.on('data', data => {
        stdout += data
      })
    }

    if (child.stderr) {
      child.stderr.on('data', data => {
        stderr += data
      })
    }

    child.on('exit', code => {
      resolve({ exitCode: code || 0, stderr, stdout })
    })

    child.on('error', error => {
      reject(error)
    })
  })
}

export { prepareClaudeArgs, runClaude, runCommand, runCommandWithOutput }
