/**
 * CLI-argument surface for publish-npm-packages: the parsed flag values and
 * the derived dry-run / dist-tag / OTP knobs, split from the publish
 * orchestration so the main script stays within the file-size cap alongside
 * its -git / -commit / -publish / -dispatch siblings.
 *
 * There is no `--force`. It used to unlock a LOCAL `pnpm stage publish`, which
 * uploads under whatever npm identity the operator happens to hold instead of
 * the CI trusted-publishing identity; that path is deleted, so the escape
 * hatch that reached it is too.
 */

import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'

import { LATEST } from '../constants/packages.mts'

export interface PublishCliArgs {
  approve?: boolean | undefined
  debug?: boolean | undefined
  distTag?: string | undefined
  'dist-tag'?: string | undefined
  dryRun?: boolean | undefined
  'dry-run'?: boolean | undefined
  forcePublish?: boolean | undefined
  'force-publish'?: boolean | undefined
  forceRegistry?: boolean | undefined
  'force-registry'?: boolean | undefined
  only?: string | undefined
  otp?: string | undefined
  publish?: boolean | undefined
  ref?: string | undefined
  skipNpmPackages?: boolean | undefined
  'skip-npm-packages'?: boolean | undefined
  quiet?: boolean | undefined
  '--'?: string[] | undefined
}

export const { values: cliArgs } = parseArgs<PublishCliArgs>({
  options: {
    approve: {
      type: 'boolean',
    },
    debug: {
      type: 'boolean',
    },
    'dist-tag': {
      type: 'string',
    },
    'dry-run': {
      type: 'boolean',
    },
    'force-publish': {
      type: 'boolean',
    },
    'force-registry': {
      type: 'boolean',
    },
    only: {
      type: 'string',
    },
    otp: {
      type: 'string',
    },
    publish: {
      type: 'boolean',
    },
    ref: {
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

export const approveFlag = !!(
  cliArgs.approve || cliArgs['--']?.includes('--approve')
)

export const otpFlag = typeof cliArgs.otp === 'string' ? cliArgs.otp : undefined

export const onlyFlag =
  typeof cliArgs.only === 'string' ? cliArgs.only : undefined

// The dist-tag every package stages under unless its own version names a
// prerelease identifier. Empty is not a value npm accepts, so a blank flag
// falls back to `latest` rather than being forwarded.
export const distTagFlag =
  (typeof cliArgs.distTag === 'string' && cliArgs.distTag) ||
  (typeof cliArgs['dist-tag'] === 'string' && cliArgs['dist-tag']) ||
  LATEST

export const refFlag = typeof cliArgs.ref === 'string' ? cliArgs.ref : undefined
