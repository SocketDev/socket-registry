#!/usr/bin/env node
/**
 * @fileoverview Main entry point for Claude Code utilities.
 * Routes commands to appropriate modules and handles CLI argument parsing.
 */

import { parseArgs } from '@socketsecurity/lib/argv/parse'
import colors from 'yoctocolors-cjs'

import { checkClaude, ensureClaudeAuthenticated } from './authentication.mjs'
import { runAudit } from './commands/audit.mjs'
import { runCleanup } from './commands/cleanup.mjs'
import { runClaudeCommit } from './commands/commit.mjs'
import { runDebug } from './commands/debug.mjs'
import { runDocumentation } from './commands/document.mjs'
import { runExplain } from './commands/explain.mjs'
import { runTestGeneration } from './commands/generate-tests.mjs'
import { runGreen } from './commands/green.mjs'
import { runMigration } from './commands/migration.mjs'
import { runOptimization } from './commands/optimize.mjs'
import { runRefactor } from './commands/refactor.mjs'
import { runCodeReview } from './commands/review.mjs'
import { runSecurityScan } from './commands/security-scan.mjs'
import { runWatchMode } from './commands/watch.mjs'
import { runDependencyAnalysis } from './commands/analyze-deps.mjs'
import { log } from './config.mjs'
import { syncClaudeMd } from './project-sync.mjs'
import { cleanupOldData, initStorage } from './storage.mjs'

function showOperations() {
  console.log('\nCore operations:')
  console.log('  --commit       Create commits with Claude assistance')
  console.log(
    '  --green        Ensure all tests pass, push, monitor CI until green',
  )
  console.log('  --push         Create commits and push to remote')
  console.log('  --sync         Synchronize CLAUDE.md files across projects')

  console.log('\nCode quality:')
  console.log('  --audit        Security and quality audit')
  console.log('  --clean        Find unused code and imports')
  console.log('  --fix          Scan for bugs and security issues')
  console.log('  --optimize     Performance optimization analysis')
  console.log('  --refactor     Suggest code improvements')
  console.log('  --review       Review staged changes before committing')

  console.log('\nDevelopment:')
  console.log('  --debug        Help debug errors')
  console.log('  --deps         Analyze dependencies')
  console.log('  --docs         Generate documentation')
  console.log('  --explain      Explain code or concepts')
  console.log('  --migrate      Migration assistance')
  console.log('  --test         Generate test cases')

  console.log('\nUtility:')
  console.log('  --help         Show this help message')
}

async function main() {
  try {
    // Initialize storage.
    await initStorage()
    await cleanupOldData()

    // Parse arguments.
    const { positionals, values } = parseArgs({
      allowPositionals: true,
      options: {
        // Core operations.
        audit: {
          default: false,
          type: 'boolean',
        },
        clean: {
          default: false,
          type: 'boolean',
        },
        commit: {
          default: false,
          type: 'boolean',
        },
        debug: {
          default: false,
          type: 'boolean',
        },
        deps: {
          default: false,
          type: 'boolean',
        },
        docs: {
          default: false,
          type: 'boolean',
        },
        'dry-run': {
          default: false,
          type: 'boolean',
        },
        explain: {
          default: false,
          type: 'boolean',
        },
        fix: {
          default: false,
          type: 'boolean',
        },
        green: {
          default: false,
          type: 'boolean',
        },
        help: {
          default: false,
          type: 'boolean',
        },
        'max-auto-fixes': {
          default: '10',
          type: 'string',
        },
        'max-retries': {
          default: '3',
          type: 'string',
        },
        migrate: {
          default: false,
          type: 'boolean',
        },
        'no-darkwing': {
          default: false,
          type: 'boolean',
        },
        'no-interactive': {
          default: false,
          type: 'boolean',
        },
        'no-report': {
          default: false,
          type: 'boolean',
        },
        'no-verify': {
          default: false,
          type: 'boolean',
        },
        optimize: {
          default: false,
          type: 'boolean',
        },
        pinky: {
          default: false,
          type: 'boolean',
        },
        prompt: {
          default: false,
          type: 'boolean',
        },
        push: {
          default: false,
          type: 'boolean',
        },
        refactor: {
          default: false,
          type: 'boolean',
        },
        review: {
          default: false,
          type: 'boolean',
        },
        seq: {
          default: false,
          type: 'boolean',
        },
        'skip-commit': {
          default: false,
          type: 'boolean',
        },
        sync: {
          default: false,
          type: 'boolean',
        },
        test: {
          default: false,
          type: 'boolean',
        },
        'the-brain': {
          default: false,
          type: 'boolean',
        },
        watch: {
          default: false,
          type: 'boolean',
        },
        workers: {
          default: '3',
          type: 'string',
        },
        // Added missing option
        'cross-repo': {
          default: false,
          type: 'boolean',
        },
      },
      strict: false,
    })

    // Check if any operation is specified.
    const hasOperation =
      values.audit ||
      values.clean ||
      values.commit ||
      values.debug ||
      values.deps ||
      values.docs ||
      values.explain ||
      values.fix ||
      values.green ||
      values.migrate ||
      values.optimize ||
      values.push ||
      values.refactor ||
      values.review ||
      values.sync ||
      values.test

    // Show help if requested or no operation specified.
    if (values.help || !hasOperation) {
      console.log('\nUsage: pnpm claude [operation] [options] [files...]')
      console.log('\nClaude-powered utilities for Socket projects.')
      showOperations()
      console.log('\nOptions:')
      console.log(
        '  --cross-repo     Operate on all Socket projects (default: current only)',
      )
      console.log('  --dry-run        Preview changes without writing files')
      console.log(
        '  --max-auto-fixes N  Max auto-fix attempts (--green, default: 10)',
      )
      console.log(
        '  --max-retries N  Max CI fix attempts (--green, default: 3)',
      )
      console.log('  --no-darkwing    Disable "Let\'s get dangerous!" mode')
      console.log('  --no-report      Skip generating scan report (--fix)')
      console.log('  --no-verify      Use --no-verify when committing')
      console.log('  --pinky          Use default model (Claude 3.5 Sonnet)')
      console.log('  --prompt         Prompt for approval before fixes (--fix)')
      console.log('  --seq            Run sequentially (default: parallel)')
      console.log("  --skip-commit    Update files but don't commit")
      console.log(
        '  --the-brain      Use ultrathink mode - "Try to take over the world!"',
      )
      console.log('  --watch          Continuous monitoring mode')
      console.log('  --workers N      Number of parallel workers (default: 3)')
      console.log('\nExamples:')
      console.log(
        '  pnpm claude --fix            # Auto-fix issues (careful mode)',
      )
      console.log(
        '  pnpm claude --fix --prompt   # Prompt for approval on each fix',
      )
      console.log(
        '  pnpm claude --fix --watch    # Continuous monitoring & fixing',
      )
      console.log('  pnpm claude --review         # Review staged changes')
      console.log('  pnpm claude --green          # Ensure CI passes')
      console.log(
        '  pnpm claude --green --dry-run  # Test green without real CI',
      )
      console.log(
        '  pnpm claude --fix --the-brain  # Deep analysis with ultrathink mode',
      )
      console.log('  pnpm claude --fix --workers 5  # Use 5 parallel workers')
      console.log(
        '  pnpm claude --test lib/utils.js  # Generate tests for a file',
      )
      console.log(
        '  pnpm claude --refactor src/index.js  # Suggest refactoring',
      )
      console.log('  pnpm claude --push           # Commit and push changes')
      console.log('  pnpm claude --help           # Show this help')
      console.log('\nRequires:')
      console.log('  - Claude Code CLI (claude) installed')
      console.log('  - GitHub CLI (gh) for --green command')
      process.exitCode = 0
      return
    }

    // Check for Claude CLI.
    log.step('Checking prerequisites')
    log.progress('Checking for Claude Code CLI')
    const claudeCmd = await checkClaude()
    if (!claudeCmd) {
      log.failed('Claude Code CLI not found')
      log.error('Please install Claude Code to use these utilities')
      console.log(`\n${colors.cyan('Installation Instructions:')}`)
      console.log('  1. Visit: https://docs.claude.com/en/docs/claude-code')
      console.log('  2. Or install via npm:')
      console.log(
        `     ${colors.green('npm install -g @anthropic/claude-desktop')}`,
      )
      console.log('  3. Or download directly:')
      console.log(`     macOS: ${colors.gray('brew install claude')}`)
      console.log(
        `     Linux: ${colors.gray('curl -fsSL https://docs.claude.com/install.sh | sh')}`,
      )
      console.log(
        `     Windows: ${colors.gray('Download from https://claude.ai/download')}`,
      )
      console.log(`\n${colors.yellow('After installation:')}`)
      console.log(`  1. Run: ${colors.green('claude')}`)
      console.log('  2. Sign in with your Anthropic account when prompted')
      console.log(`  3. Try again: ${colors.green('pnpm claude --help')}`)
      process.exitCode = 1
      return
    }

    // Ensure Claude is authenticated
    const isClaudeAuthenticated = await ensureClaudeAuthenticated(claudeCmd)
    if (!isClaudeAuthenticated) {
      log.error('Unable to authenticate with Claude Code')
      console.log(
        colors.red('\nAuthentication is required to use Claude utilities.'),
      )
      console.log(
        'Please ensure Claude Code is properly authenticated and try again.',
      )
      process.exitCode = 1
      return
    }

    // Configure execution mode based on flags
    const executionMode = {
      // Auto-fix by default unless --prompt
      autoFix: !values.prompt,
      model: values['the-brain']
        ? 'the-brain'
        : values.pinky
          ? 'pinky'
          : 'auto',
      watch: values.watch || false,
      workers: Number.parseInt(values.workers, 10) || 3,
    }

    // Display execution mode
    if (executionMode.workers > 1) {
      log.substep(`🚀 Parallel mode: ${executionMode.workers} workers`)
    }
    if (executionMode.watch) {
      log.substep('Watch mode: Continuous monitoring enabled')
    }
    if (!executionMode.autoFix) {
      log.substep('Prompt mode: Fixes require approval')
    }

    // Execute requested operation.
    let success = true
    const options = { ...values, executionMode, positionals }

    // Check if watch mode is enabled
    if (executionMode.watch) {
      // Start continuous monitoring
      await runWatchMode(claudeCmd, options)
      // Watch mode runs indefinitely
      return
    }

    // Core operations.
    if (values.sync) {
      success = await syncClaudeMd(claudeCmd, options)
    } else if (values.commit) {
      success = await runClaudeCommit(claudeCmd, options)
    } else if (values.push) {
      // --push combines commit and push.
      success = await runClaudeCommit(claudeCmd, { ...options, push: true })
    } else if (values.green) {
      success = await runGreen(claudeCmd, options)
    }
    // Code quality operations.
    else if (values.review) {
      success = await runCodeReview(claudeCmd, options)
    } else if (values.fix) {
      success = await runSecurityScan(claudeCmd, options)
    } else if (values.refactor) {
      success = await runRefactor(claudeCmd, options)
    } else if (values.optimize) {
      success = await runOptimization(claudeCmd, options)
    } else if (values.clean) {
      success = await runCleanup(claudeCmd, options)
    } else if (values.audit) {
      success = await runAudit(claudeCmd, options)
    }
    // Development operations.
    else if (values.test) {
      success = await runTestGeneration(claudeCmd, options)
    } else if (values.docs) {
      success = await runDocumentation(claudeCmd, options)
    } else if (values.explain) {
      success = await runExplain(claudeCmd, options)
    } else if (values.debug) {
      success = await runDebug(claudeCmd, options)
    } else if (values.deps) {
      success = await runDependencyAnalysis(claudeCmd, options)
    } else if (values.migrate) {
      success = await runMigration(claudeCmd, options)
    }

    process.exitCode = success ? 0 : 1
  } catch (error) {
    log.error(`Operation failed: ${error.message}`)
    process.exitCode = 1
  }
}

main().catch(e => log.error(e))
