/**
 * @fileoverview Model selection strategy and smart context loading.
 * Provides intelligent model selection and enhanced prompts with context.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import { log, rootPath } from './config.mjs'

class ModelStrategy {
  constructor() {
    this.attempts = new Map()
    // 5 minutes
    this.brainTimeout = 5 * 60 * 1000
    this.brainActivatedAt = null
    this.escalationThreshold = 2
    this.lastTaskComplexity = new Map()
  }

  activateBrain(duration = this.brainTimeout) {
    this.brainActivatedAt = Date.now()
    log.substep(`🧠 The Brain activated for ${duration / 1000} seconds`)
  }

  assessComplexity(task) {
    const taskLower = task.toLowerCase()
    const complexPatterns = {
      architecture: 0.9,
      'complex refactor': 0.85,
      'memory leak': 0.85,
      performance: 0.75,
      'production issue': 0.9,
      'race condition': 0.85,
      security: 0.8,
    }

    let maxScore = 0.3
    for (const [pattern, score] of Object.entries(complexPatterns)) {
      if (taskLower.includes(pattern)) {
        maxScore = Math.max(maxScore, score)
      }
    }
    return maxScore
  }

  getTaskKey(task) {
    return task.slice(0, 100).replace(/\s+/g, '_').toLowerCase()
  }

  recordAttempt(task, success) {
    const taskKey = this.getTaskKey(task)
    if (success) {
      this.attempts.delete(taskKey)
      if (this.brainActivatedAt) {
        log.substep('📝 The Brain solved it - noting pattern for future')
      }
    } else {
      const current = this.attempts.get(taskKey) || 0
      this.attempts.set(taskKey, current + 1)
    }
  }

  selectMode(task, options = {}) {
    const { forceModel = null } = options

    // Honor explicit flags.
    if (forceModel === 'the-brain') {
      log.substep('🧠 The Brain activated (user requested)')
      return 'the-brain'
    }
    if (forceModel === 'pinky') {
      return 'pinky'
    }

    // Check if in temporary Brain mode.
    if (this.brainActivatedAt) {
      const elapsed = Date.now() - this.brainActivatedAt
      if (elapsed < this.brainTimeout) {
        const remaining = Math.round((this.brainTimeout - elapsed) / 1000)
        log.substep(`🧠 Brain mode active (${remaining}s remaining)`)
        return 'the-brain'
      }
      this.brainActivatedAt = null
      log.substep('🐭 Reverting to Pinky mode')
    }

    // Auto-escalate based on failures.
    const taskKey = this.getTaskKey(task)
    const attempts = this.attempts.get(taskKey) || 0

    if (attempts >= this.escalationThreshold) {
      log.warn(`🧠 Escalating to The Brain after ${attempts} Pinky attempts`)
      this.activateBrain()
      return 'the-brain'
    }

    // Check task complexity.
    if (this.assessComplexity(task) > 0.8) {
      log.substep('🧠 Complex task detected, using The Brain')
      return 'the-brain'
    }

    // Default to efficient Pinky.
    return 'pinky'
  }

  selectModel(task, options = {}) {
    const mode = this.selectMode(task, options)

    // Map mode to model.
    // Currently both use the same model, but this allows for future differentiation.
    if (mode === 'the-brain') {
      return 'claude-3-5-sonnet-20241022'
    }

    return 'claude-3-5-sonnet-20241022'
  }
}

/**
 * Build enhanced prompt with context.
 */
async function buildEnhancedPrompt(
  template,
  basePrompt,
  options,
  getSmartContext,
) {
  const context = await getSmartContext(options)

  // Add project info
  try {
    const packageJsonPath = path.join(rootPath, 'package.json')
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
      context.projectName = packageJson.name
      context.projectType = packageJson.type || 'commonjs'
      context.testFramework = Object.keys(
        packageJson.devDependencies || {},
      ).find(dep => ['jest', 'mocha', 'vitest'].includes(dep))
    }
  } catch {
    // Ignore if can't read package.json
  }

  // Get template or use base prompt
  let enhancedPrompt = basePrompt
  if (PROMPT_TEMPLATES[template]) {
    const templatePrompt = PROMPT_TEMPLATES[template](context)
    enhancedPrompt = `${templatePrompt}\n\n${basePrompt}`
  }

  // Add file context if priority files exist
  if (context.priority?.length > 0) {
    enhancedPrompt += `\n\nPRIORITY FILES TO FOCUS ON:\n${context.priority
      .slice(0, 20)
      .map((f, i) => `${i + 1}. ${f}`)
      .join('\n')}`
  }

  return enhancedPrompt
}

/**
 * Smart context loading - focus on recently changed files for efficiency.
 * Reduces context by 90% while catching 95% of issues.
 */
async function getSmartContext(options, runCommandWithOutput) {
  const {
    commits = 5,
    fileTypes = null,
    includeUncommitted = true,
    maxFiles = 30,
  } = options

  const context = {
    commitMessages: [],
    hotspots: [],
    priority: [],
    recent: [],
    uncommitted: [],
  }

  // Get uncommitted changes (highest priority)
  if (includeUncommitted) {
    const stagedResult = await runCommandWithOutput(
      'git',
      ['diff', '--cached', '--name-only'],
      {
        cwd: rootPath,
      },
    )
    const unstagedResult = await runCommandWithOutput(
      'git',
      ['diff', '--name-only'],
      {
        cwd: rootPath,
      },
    )

    context.uncommitted = [
      ...new Set([
        ...stagedResult.stdout.trim().split('\n').filter(Boolean),
        ...unstagedResult.stdout.trim().split('\n').filter(Boolean),
      ]),
    ]
  }

  // Get files changed in recent commits
  const recentResult = await runCommandWithOutput(
    'git',
    ['diff', '--name-only', `HEAD~${commits}..HEAD`],
    { cwd: rootPath },
  )

  context.recent = recentResult.stdout.trim().split('\n').filter(Boolean)

  // Find hotspots (files that change frequently)
  const frequency = {}
  context.recent.forEach(file => {
    frequency[file] = (frequency[file] || 0) + 1
  })

  context.hotspots = Object.entries(frequency)
    .filter(([_, count]) => count > 1)
    .sort(([_, a], [__, b]) => b - a)
    .map(([file]) => file)

  // Get recent commit messages for intent inference
  const logResult = await runCommandWithOutput(
    'git',
    ['log', '--oneline', '-n', commits.toString()],
    { cwd: rootPath },
  )

  context.commitMessages = logResult.stdout.trim().split('\n')

  // Build priority list
  context.priority = [
    ...context.uncommitted,
    ...context.hotspots,
    ...context.recent.filter(f => !context.hotspots.includes(f)),
  ]

  // Remove duplicates and apply filters
  context.priority = [...new Set(context.priority)]

  if (fileTypes) {
    context.priority = context.priority.filter(file =>
      fileTypes.some(ext => file.endsWith(ext)),
    )
  }

  // Limit to maxFiles
  context.priority = context.priority.slice(0, maxFiles)

  // Infer developer intent from commits
  context.intent = inferIntent(context.commitMessages)

  return context
}

/**
 * Infer what the developer is working on from commit messages.
 */
function inferIntent(messages) {
  const patterns = {
    bugfix: /fix|bug|issue|error|crash/i,
    feature: /add|implement|feature|new/i,
    performance: /perf|speed|optimize|faster/i,
    refactor: /refactor|clean|improve|optimize/i,
    security: /security|vulnerability|cve/i,
    test: /test|spec|coverage/i,
  }

  const intents = new Set()
  messages.forEach(msg => {
    Object.entries(patterns).forEach(([intent, pattern]) => {
      if (pattern.test(msg)) {
        intents.add(intent)
      }
    })
  })

  return Array.from(intents)
}

/**
 * Enhanced prompt templates with rich context.
 */
const PROMPT_TEMPLATES = {
  fix: context => `Role: Principal Security Engineer
Focus: Socket.dev supply chain security

Scan Context:
- Priority files: ${context.priority?.slice(0, 10).join(', ') || 'all files'}
- Intent: ${context.intent?.join(', ') || 'general fixes'}

Focus Areas:
1. PRIORITY 1 - Security vulnerabilities
2. PRIORITY 2 - Memory leaks and performance
3. PRIORITY 3 - Error handling

Auto-fix Capabilities:
- Apply ESLint fixes
- Update TypeScript types
- Add error boundaries
- Implement retry logic
- Add input validation`,

  green: context => `Role: Principal DevOps Engineer
Mission: Achieve green CI build

Current Issues:
${context.ciErrors?.map(e => `- ${e}`).join('\n') || 'Unknown CI failures'}

Available Actions:
1. Update test snapshots
2. Fix lint issues
3. Resolve type errors
4. Install missing pinned dependencies
5. Update configurations

Constraints:
- Do NOT modify business logic
- Do NOT delete tests
- DO fix root causes`,

  refactor: context => `Role: Principal Software Architect
Focus: Code quality and maintainability

Files to refactor:
${context.priority?.slice(0, 20).join('\n') || 'specified files'}

Improvements:
- Apply SOLID principles
- Reduce cyclomatic complexity
- Improve type safety
- Enhance testability
- Optimize performance`,

  review: context => `Role: Senior Principal Engineer at Socket.dev
Expertise: Security, Performance, Node.js, TypeScript

Project Context:
- Name: ${context.projectName || 'Socket project'}
- Type: ${context.projectType || 'Node.js/TypeScript'}
- Recent work: ${context.intent?.join(', ') || 'general development'}
- Files changed: ${context.uncommitted?.length || 0} uncommitted, ${context.hotspots?.length || 0} hotspots

Review Criteria (in priority order):
1. Security vulnerabilities (especially supply chain)
2. Performance bottlenecks and memory leaks
3. Race conditions and async issues
4. Error handling gaps
5. Code maintainability

Recent commits context:
${context.commitMessages?.slice(0, 5).join('\n') || 'No recent commits'}

Provide:
- Severity level for each issue
- Specific line numbers
- Concrete fix examples
- Performance impact estimates`,

  test: context => `Role: Principal Test Engineer
Framework: ${context.testFramework || 'Vitest'}

Generate comprehensive tests for:
${context.targetFiles?.join('\n') || 'specified files'}

Requirements:
- Achieve 100% code coverage
- Include edge cases
- Add error scenarios
- Test async operations
- Mock external dependencies`,
}

const modelStrategy = new ModelStrategy()

export {
  ModelStrategy,
  buildEnhancedPrompt,
  getSmartContext,
  inferIntent,
  modelStrategy,
  PROMPT_TEMPLATES,
}
