'use strict'

const { envAsString } = /*@__PURE__*/ require('../env')

// npm_lifecycle_event is set by npm, pnpm, yarn, bun, and vlt during script execution.
// This environment variable contains the name of the script being run (e.g., 'test', 'build', 'start').
// It's universally supported across all major package managers:
// - npm: Sets this for all lifecycle scripts since early versions
// - pnpm: Fully compatible with npm's behavior
// - yarn: Both Classic (v1) and Berry (v2+) set this variable
// - bun: Sets this when running scripts via 'bun run'
// - vlt: The new Volt package manager by npm also sets this
//
// Examples:
// - When running 'npm test', npm_lifecycle_event = 'test'
// - When running 'pnpm build', npm_lifecycle_event = 'build'
// - When running 'yarn start', npm_lifecycle_event = 'start'
// - When running 'bun run dev', npm_lifecycle_event = 'dev'
// - When running 'vlt run lint', npm_lifecycle_event = 'lint'
//
// This is useful for scripts that need to know which lifecycle event triggered them,
// allowing conditional behavior based on the current script context.
module.exports = envAsString(process.env.npm_lifecycle_event)
