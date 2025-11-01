/**
 * @fileoverview Configuration constants for Claude utilities.
 * Defines paths, pricing, project lists, and retention policies.
 */

import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import colors from 'yoctocolors-cjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..', '..')
const parentPath = path.join(rootPath, '..')
const claudeDir = path.join(rootPath, '.claude')
const WIN32 = process.platform === 'win32'

// Socket project names.
const SOCKET_PROJECTS = [
  'socket-cli',
  'socket-lib',
  'socket-packageurl-js',
  'socket-registry',
  'socket-sdk-js',
]

// Storage paths.
// User-level (cross-repo, persistent)
const CLAUDE_HOME = path.join(os.homedir(), '.claude')
const STORAGE_PATHS = {
  cache: path.join(CLAUDE_HOME, 'cache'),
  config: path.join(CLAUDE_HOME, 'config.json'),
  fixMemory: path.join(CLAUDE_HOME, 'fix-memory.db'),
  history: path.join(CLAUDE_HOME, 'history.json'),
  stats: path.join(CLAUDE_HOME, 'stats.json'),
}

// Repo-level (per-project, temporary)
const REPO_STORAGE = {
  scratch: path.join(claudeDir, 'scratch'),
  session: path.join(claudeDir, 'session.json'),
  snapshots: path.join(claudeDir, 'snapshots'),
}

// Retention periods (milliseconds).
const RETENTION = {
  // 30 days
  cache: 30 * 24 * 60 * 60 * 1000,
  // 1 day
  sessions: 24 * 60 * 60 * 1000,
  // 7 days
  snapshots: 7 * 24 * 60 * 60 * 1000,
}

// Claude API pricing (USD per token).
// https://www.anthropic.com/pricing
const PRICING = {
  'claude-sonnet-3-7': {
    // $0.30 per 1M cache read tokens
    cache_read: 0.3 / 1_000_000,
    // $3.75 per 1M cache write tokens
    cache_write: 3.75 / 1_000_000,
    // $3 per 1M input tokens
    input: 3.0 / 1_000_000,
    // $15 per 1M output tokens
    output: 15.0 / 1_000_000,
  },
  'claude-sonnet-4-5': {
    // $0.30 per 1M cache read tokens
    cache_read: 0.3 / 1_000_000,
    // $3.75 per 1M cache write tokens
    cache_write: 3.75 / 1_000_000,
    // $3 per 1M input tokens
    input: 3.0 / 1_000_000,
    // $15 per 1M output tokens
    output: 15.0 / 1_000_000,
  },
}

// Simple inline logger.
const log = {
  done: msg => {
    process.stdout.write('\r\x1b[K')
    console.log(`  ${colors.green('✓')} ${msg}`)
  },
  error: msg => console.error(`${colors.red('✗')} ${msg}`),
  failed: msg => {
    process.stdout.write('\r\x1b[K')
    console.log(`  ${colors.red('✗')} ${msg}`)
  },
  info: msg => console.log(msg),
  progress: msg => {
    process.stdout.write('\r\x1b[K')
    process.stdout.write(`  ∴ ${msg}`)
  },
  step: msg => console.log(`\n${msg}`),
  substep: msg => console.log(`  ${msg}`),
  success: msg => console.log(`${colors.green('✓')} ${msg}`),
  warn: msg => console.log(`${colors.yellow('⚠')} ${msg}`),
}

export {
  CLAUDE_HOME,
  PRICING,
  REPO_STORAGE,
  RETENTION,
  SOCKET_PROJECTS,
  STORAGE_PATHS,
  WIN32,
  claudeDir,
  log,
  parentPath,
  rootPath,
}
