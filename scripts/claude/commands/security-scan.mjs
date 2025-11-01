/**
 * @fileoverview Security scan command for Claude CLI.
 * Scans projects for security and quality issues and provides auto-fix capabilities.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import colors from 'yoctocolors-cjs'

import { SOCKET_PROJECTS, claudeDir, parentPath, rootPath } from '../config.mjs'
import { buildEnhancedPrompt } from '../prompt-builder.mjs'
import {
  ensureClaudeInGitignore,
  executeParallel,
  getSmartContext,
  log,
  prepareClaudeArgs,
  printFooter,
  printHeader,
  runClaude,
  runCommandWithOutput,
  runParallel,
  shouldRunParallel,
} from '../utils.mjs'

/**
 * Autonomous fix session - auto-fixes high-confidence issues.
 */
async function autonomousFixSession(
  claudeCmd,
  scanResults,
  projects,
  options = {},
) {
  const opts = { __proto__: null, ...options }
  printFooter('Auto-Fix Mode')

  // Group issues by severity.
  const critical = []
  const high = []
  const medium = []
  const low = []

  for (const project in scanResults) {
    const issues = scanResults[project] || []
    for (const issue of issues) {
      issue.project = project
      switch (issue.severity) {
        case 'critical':
          critical.push(issue)
          break
        case 'high':
          high.push(issue)
          break
        case 'medium':
          medium.push(issue)
          break
        default:
          low.push(issue)
      }
    }
  }

  const totalIssues = critical.length + high.length + medium.length + low.length

  log.info('Auto-fix mode: Carefully fixing issues with double-checking')
  console.log('\nIssues found:')
  console.log(`  ${colors.red(`Critical: ${critical.length}`)}`)
  console.log(`  ${colors.yellow(`High: ${high.length}`)}`)
  console.log(`  ${colors.cyan(`Medium: ${medium.length}`)}`)
  console.log(`  ${colors.gray(`Low: ${low.length}`)}`)

  if (totalIssues === 0) {
    log.success('No issues found!')
    return
  }

  // Auto-fixable issue types (high confidence)
  const autoFixableTypes = new Set([
    'console-log',
    'missing-await',
    'unused-variable',
    'missing-semicolon',
    'wrong-import-path',
    'deprecated-api',
    'type-error',
    'lint-error',
  ])

  // Determine which issues to auto-fix
  const toAutoFix = [...critical, ...high].filter(issue => {
    // Auto-fix if type is in whitelist OR severity is critical
    return issue.severity === 'critical' || autoFixableTypes.has(issue.type)
  })

  const toReview = [...critical, ...high, ...medium].filter(issue => {
    return !toAutoFix.includes(issue)
  })

  log.step(`Auto-fixing ${toAutoFix.length} high-confidence issues`)
  log.substep(`${toReview.length} issues will require manual review`)

  // Apply auto-fixes in parallel based on workers setting
  const workers = Number.parseInt(opts.workers, 10) || 3
  if (toAutoFix.length > 0) {
    const fixTasks = toAutoFix.map(issue => async () => {
      const projectData = projects.find(p => p.name === issue.project)
      if (!projectData) {
        return false
      }

      const fixPrompt = `Fix this issue automatically:
File: ${issue.file}
Line: ${issue.line}
Type: ${issue.type}
Severity: ${issue.severity}
Description: ${issue.description}
Suggested fix: ${issue.fix}

Apply the fix and return ONLY the fixed code snippet.`

      const result = await runClaude(claudeCmd, fixPrompt, {
        ...opts,
        cache: false,
        interactive: false,
      })

      if (result) {
        log.done(`Fixed: ${issue.file}:${issue.line} - ${issue.type}`)
        return true
      }
      return false
    })

    await executeParallel(fixTasks, workers)
  }

  // Report issues that need review
  if (toReview.length > 0) {
    console.log(`\n${colors.yellow('Issues requiring manual review:')}`)
    toReview.forEach((issue, i) => {
      console.log(
        `${i + 1}. [${issue.severity}] ${issue.file}:${issue.line} - ${issue.description}`,
      )
    })
    console.log('\nRun with --prompt to fix these interactively')
  }

  log.success('Autonomous fix session complete!')
}

/**
 * Interactive fix session with Claude.
 */
async function interactiveFixSession(
  claudeCmd,
  scanResults,
  _projects,
  options = {},
) {
  const opts = { __proto__: null, ...options }
  printFooter('Interactive Fix Session')

  // Group issues by severity.
  const critical = []
  const high = []
  const medium = []
  const low = []

  for (const project in scanResults) {
    const issues = scanResults[project] || []
    for (const issue of issues) {
      issue.project = project
      switch (issue.severity) {
        case 'critical':
          critical.push(issue)
          break
        case 'high':
          high.push(issue)
          break
        case 'medium':
          medium.push(issue)
          break
        default:
          low.push(issue)
      }
    }
  }

  const totalIssues = critical.length + high.length + medium.length + low.length

  console.log('\nScan Results:')
  console.log(`  ${colors.red(`Critical: ${critical.length}`)}`)
  console.log(`  ${colors.yellow(`High: ${high.length}`)}`)
  console.log(`  ${colors.cyan(`Medium: ${medium.length}`)}`)
  console.log(`  ${colors.gray(`Low: ${low.length}`)}`)
  console.log(`  Total: ${totalIssues} issues found`)

  if (totalIssues === 0) {
    log.success('No issues found!')
    return
  }

  // Start interactive session.
  console.log(
    `\n${colors.blue('Starting interactive fix session with Claude...')}`,
  )
  console.log('Claude will help you fix these issues.')
  console.log('Commands: fix <issue-number>, commit, push, exit\n')

  // Create a comprehensive prompt for Claude.
  const sessionPrompt = `You are helping fix security and quality issues in Socket projects.

Here are the issues found:

CRITICAL ISSUES:
${critical.map((issue, i) => `${i + 1}. [${issue.project}] ${issue.file}:${issue.line} - ${issue.description}`).join('\n') || 'None'}

HIGH SEVERITY:
${high.map((issue, i) => `${critical.length + i + 1}. [${issue.project}] ${issue.file}:${issue.line} - ${issue.description}`).join('\n') || 'None'}

MEDIUM SEVERITY:
${medium.map((issue, i) => `${critical.length + high.length + i + 1}. [${issue.project}] ${issue.file}:${issue.line} - ${issue.description}`).join('\n') || 'None'}

LOW SEVERITY:
${low.map((issue, i) => `${critical.length + high.length + medium.length + i + 1}. [${issue.project}] ${issue.file}:${issue.line} - ${issue.description}`).join('\n') || 'None'}

You can:
1. Fix specific issues by number
2. Create commits (no AI attribution)
3. Push changes to remote
4. Provide guidance on fixing issues

Start by recommending which issues to fix first.`

  // Launch Claude console in interactive mode.
  await runCommandWithOutput(claudeCmd, prepareClaudeArgs([], opts), {
    input: sessionPrompt,
    stdio: 'inherit',
  })
}

/**
 * Scan project for security and quality issues.
 */
async function scanProjectForIssues(claudeCmd, project, options = {}) {
  const opts = { __proto__: null, ...options }
  const { name, path: projectPath } = project

  log.progress(`Scanning ${name} for issues`)

  // Find source files to scan
  const extensions = ['.js', '.mjs', '.ts', '.mts', '.jsx', '.tsx']
  const allFiles = []

  async function findFiles(dir, depth = 0) {
    // Limit depth to avoid excessive scanning
    if (depth > 5) {
      return
    }

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        // Skip common directories to ignore.
        if (entry.isDirectory()) {
          if (
            [
              'node_modules',
              '.git',
              'dist',
              'build',
              'coverage',
              '.cache',
            ].includes(entry.name)
          ) {
            continue
          }
          await findFiles(fullPath, depth + 1)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name)
          if (extensions.includes(ext)) {
            allFiles.push(fullPath)
          }
        }
      }
    } catch (e) {
      // Log permission errors but continue scanning.
      if (e.code === 'EACCES' || e.code === 'EPERM') {
        // Silently skip permission errors.
      } else {
        log.warn(`Error scanning ${dir}: ${e.message}`)
      }
    }
  }

  await findFiles(projectPath)

  // Use smart context if available to prioritize files
  let filesToScan = allFiles
  if (opts.smartContext !== false) {
    const context = await getSmartContext({
      fileTypes: extensions,
      maxFiles: 100,
    })

    if (context.priority.length > 0) {
      // Prioritize recently changed files
      const priorityFiles = context.priority
        .map(f => path.join(projectPath, f))
        .filter(f => allFiles.includes(f))

      // Add other files after priority ones
      const otherFiles = allFiles.filter(f => !priorityFiles.includes(f))
      filesToScan = [...priorityFiles, ...otherFiles]

      log.substep(`Prioritizing ${priorityFiles.length} recently changed files`)
    }
  }

  // Limit total files to scan
  const MAX_FILES = 500
  if (filesToScan.length > MAX_FILES) {
    log.substep(
      `Limiting scan to first ${MAX_FILES} files (${filesToScan.length} total found)`,
    )
    filesToScan = filesToScan.slice(0, MAX_FILES)
  }

  // Create enhanced scanning prompt with context
  const basePrompt = `You are performing a security and quality audit on the ${name} project.

Scan for the following issues:
1. **Logic bugs**: Incorrect conditions, off-by-one errors, wrong operators
2. **Race conditions**: Async/await issues, promise handling, concurrent access
3. **Cross-platform issues**:
   - Hard-coded path separators (/ or \\)
   - System-specific assumptions
   - File path handling without path.join/path.resolve
   - Platform-specific commands without checks
4. **File system failure cases**:
   - Missing error handling for file operations
   - No checks for file/directory existence
   - Uncaught ENOENT, EACCES, EPERM errors
5. **Async failure cases**:
   - Unhandled promise rejections
   - Missing try/catch around async operations
   - Fire-and-forget promises
6. **HTTP/API issues**:
   - Missing timeout configurations
   - No retry logic for transient failures
   - Unhandled network errors
7. **Memory leaks**:
   - Event listeners not cleaned up
   - Large objects kept in closures
   - Circular references
8. **Security issues**:
   - Command injection vulnerabilities
   - Path traversal vulnerabilities
   - Unsafe use of eval or Function constructor
   - Hardcoded secrets or credentials

For each issue found, provide:
- File path and line number
- Issue type and severity (critical/high/medium/low)
- Description of the problem
- Suggested fix

Format your response as a JSON array:
[
  {
    "file": "path/to/file.js",
    "line": 42,
    "severity": "high",
    "type": "race-condition",
    "description": "Async operation without proper await",
    "fix": "Add await before the async call"
  }
]

Files to scan: ${filesToScan.length} files in ${name}

Provide ONLY the JSON array, nothing else.`

  // Use enhanced prompt for better context
  const enhancedPrompt = await buildEnhancedPrompt('fix', basePrompt, {
    maxFiles: 50,
    smartContext: true,
  })

  // Call Claude to scan.
  const result = await runCommandWithOutput(
    claudeCmd,
    prepareClaudeArgs([], options),
    {
      input: enhancedPrompt,
      // 10MB buffer for large responses
      maxBuffer: 1024 * 1024 * 10,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  )

  if (result.exitCode !== 0) {
    log.failed(`Failed to scan ${name}`)
    return null
  }

  log.done(`Scanned ${name}`)

  try {
    return JSON.parse(result.stdout.trim())
  } catch {
    log.warn(`Failed to parse scan results for ${name}`)
    return null
  }
}

/**
 * Run security and quality scan on Socket projects.
 */
async function runSecurityScan(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Security & Quality Scanner')

  // Find projects to scan.
  log.step('Finding projects to scan')
  const projects = []

  if (!opts['cross-repo']) {
    // Default: Scan only current project.
    const currentProjectName = path.basename(rootPath)
    projects.push({
      name: currentProjectName,
      path: rootPath,
    })
    log.info('Scanning current project only')
  } else {
    // With --cross-repo: Scan all Socket projects.
    for (const projectName of SOCKET_PROJECTS) {
      const projectPath = path.join(parentPath, projectName)
      if (existsSync(projectPath)) {
        projects.push({
          name: projectName,
          path: projectPath,
        })
      }
    }
  }

  if (projects.length === 0) {
    log.error('No projects found to scan')
    return false
  }

  log.success(`Found ${projects.length} project(s) to scan`)

  // Scan each project.
  log.step('Scanning projects for issues')
  const scanResults = {}

  if (shouldRunParallel(opts) && projects.length > 1) {
    // Run scans in parallel
    const tasks = projects.map(project =>
      scanProjectForIssues(claudeCmd, project, options)
        .then(issues => ({ issues, project: project.name }))
        .catch(error => ({ error, issues: null, project: project.name })),
    )

    const taskNames = projects.map(p => p.name)
    const results = await runParallel(tasks, 'security scans', taskNames)

    // Collect results
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.issues) {
        scanResults[result.value.project] = result.value.issues
      }
    })
  } else {
    // Run sequentially
    for (const project of projects) {
      const issues = await scanProjectForIssues(claudeCmd, project, options)
      if (issues) {
        scanResults[project.name] = issues
      }
    }
  }

  // Generate report.
  if (!opts['no-report']) {
    log.step('Generating scan report')
    // Ensure .claude is in .gitignore before writing scratch files.
    await ensureClaudeInGitignore()
    // Ensure .claude directory exists for scratch files.
    await fs.mkdir(claudeDir, { recursive: true })
    const reportPath = path.join(claudeDir, 'security-scan-report.json')
    await fs.writeFile(reportPath, JSON.stringify(scanResults, null, 2))
    log.done(`Report saved to: ${reportPath}`)
  }

  // Start fix session based on mode.
  if (opts.prompt) {
    // Prompt mode - user approves each fix
    await interactiveFixSession(claudeCmd, scanResults, projects, options)
  } else {
    // Default: Auto-fix mode with careful checking
    await autonomousFixSession(claudeCmd, scanResults, projects, options)
  }

  return true
}

export { runSecurityScan }
