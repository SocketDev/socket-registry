/**
 * CLI-argument surface for publish-npm-packages: the parsed flag values and
 * the derived dry-run / OTP knobs, split from the publish orchestration so
 * the main script stays within the file-size cap alongside its
 * -git / -commit / -publish siblings.
 */

import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'

export interface PublishCliArgs {
  debug?: boolean | undefined
  dryRun?: boolean | undefined
  'dry-run'?: boolean | undefined
  force?: boolean | undefined
  forcePublish?: boolean | undefined
  'force-publish'?: boolean | undefined
  forceRegistry?: boolean | undefined
  'force-registry'?: boolean | undefined
  otp?: string | undefined
  skipNpmPackages?: boolean | undefined
  'skip-npm-packages'?: boolean | undefined
  quiet?: boolean | undefined
  '--'?: string[] | undefined
}

export const { values: cliArgs } = parseArgs<PublishCliArgs>({
  options: {
    debug: {
      type: 'boolean',
    },
    'dry-run': {
      type: 'boolean',
    },
    force: {
      type: 'boolean',
      short: 'f',
    },
    'force-publish': {
      type: 'boolean',
    },
    'force-registry': {
      type: 'boolean',
    },
    otp: {
      type: 'string',
    },
    'skip-npm-packages': {
      type: 'boolean',
    },
    quiet: {
      type: 'boolean',
    },
  },
  strict: false,
})

// --dry-run previews the staged-publish + approve leaf without spawning
// `pnpm stage publish` / `pnpm stage approve` — no auth-requiring network
// calls. --otp pre-supplies the 2FA code for the approve batch loop (CI /
// scripted use); interactive runs are prompted instead.
export const dryRunFlag = !!(
  cliArgs.dryRun ||
  cliArgs['dry-run'] ||
  cliArgs['--']?.includes('--dry-run')
)

export const otpFlag = typeof cliArgs.otp === 'string' ? cliArgs.otp : undefined
