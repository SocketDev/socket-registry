# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2025-10-05

### Added

- Added `isolatePackage` test helper for creating isolated package test environments
- Added support for testing local development packages in addition to socket-registry packages

### Changed

- Renamed `setupPackageTest` to `isolatePackage` for clearer intent
- Refactored `installPackageForTesting` to accept explicit `sourcePath` and `packageName` parameters
- Simplified package installation logic by removing path detection from low-level function
- Consolidated `setupPackageTest` and `setupMultiEntryTest` into single `isolatePackage` function with options

## [1.4.6] - 2025-10-05

### Added

- Added comprehensive package.json exports validation tests


## [1.4.5] - 2025-10-05

### Added

- Added performance monitoring utilities with timer, measurement, and reporting functions
- Added memoization utilities with LRU, TTL, weak references, and promise deduplication support
- Added table formatting utilities (`formatTable`, `formatSimpleTable`) for CLI output
- Added progress tracking to spinner with `updateProgress()` and `incrementProgress()` methods
- Added `isDir` and `safeStats` async helpers to fs module

### Changed

- Removed `platform` and `arch` options from `dlxBinary` function as cross-platform binary execution is not supported

### Fixed

- Fixed Windows shell execution in `dlxBinary` by adding cache directory to PATH

## [1.4.4] - 2025-10-05

### Fixed

- Fixed subpath exports

## [1.4.3] - 2025-10-04

### Added

- Spinner lifecycle utilities (`withSpinner`, `withSpinnerRestore`, `withSpinnerSync`) for automatic spinner cleanup with try/finally blocks

## [1.4.2] - 2025-10-04

### Added

- Added `GITHUB_API_BASE_URL` constant for GitHub API endpoint configuration
- Added `SOCKET_API_BASE_URL` constant for Socket API endpoint configuration
- Added generic TTL cache utility (`createTtlCache`) with in-memory memoization and persistent storage support

### Changed

- Refactored GitHub caching to use the new `cache-with-ttl` utility for better performance and consistency

## [1.4.1] - 2025-10-04

### Changed

- Update maintained Node.js versions of `constants.maintainedNodeVersions`

## [1.4.0] - 2025-10-04

### Added

- Added `PromiseQueue` utility for controlled concurrency operations
- Added lazy dependency loaders and test utilities
- Added HTTP utilities with retry logic and download locking
- Added `.claude` directory for scratch documents
- Added `noUnusedLocals` and `noUnusedParameters` to TypeScript config

### Changed

- Refactored all library functions to use options objects for better API consistency
  - `lib/strings.ts` - String manipulation functions
  - `lib/url.ts` - URL handling functions
  - `lib/words.ts` - Word manipulation functions
- Refactored `lib/packages` module into specialized submodules for improved code organization
  - `lib/packages/editable.ts` - Package editing functionality
  - `lib/packages/exports.ts` - Export resolution utilities
  - `lib/packages/licenses.ts` - License handling and validation
  - `lib/packages/manifest.ts` - Manifest data operations
  - `lib/packages/normalize.ts` - Path normalization utilities
  - `lib/packages/operations.ts` - Package installation and modification operations
  - `lib/packages/paths.ts` - Package path utilities
  - `lib/packages/provenance.ts` - Package provenance verification
  - `lib/packages/specs.ts` - Package spec parsing
  - `lib/packages/validation.ts` - Package validation utilities
- Moved configuration files (vitest, eslint, knip, oxlint, taze) to `.config` directory
- Replaced `fetch()` with Node.js native `http`/`https` modules for better reliability
- Replaced `any` types with meaningful types across library utilities
- Improved pnpm security with build script allowlist
- Updated vitest coverage thresholds to 80%
- Consolidated test files to reduce duplication
- Note: Public API remains unchanged; these are internal organizational improvements

### Fixed

- Fixed resource leaks and race conditions in socket-registry
- Fixed `yarn-cache-path` constant to return string type consistently
- Fixed Yarn Windows temp path detection in `shouldSkipShadow`
- Fixed path normalization for Windows compatibility across all path utilities
- Fixed cache path tests for Windows case sensitivity
- Fixed type errors in promises, parse-args, logger, and specs tests
- Fixed GitHub tests to mock `httpRequest` correctly
- Fixed SEA build tests to mock `httpRequest`
- Decoded URL percent-encoding in `pathLikeToString` fallback

## [1.3.10] - 2025-10-03

### Added

- New utility modules for DLX, shadow, SEA, cacache, and versions functionality
- getSocketHomePath alias to paths module
- del dependency and external wrapper for safer file deletion
- @fileoverview tags to lib modules
- camelCase expansion for kebab-case arguments in parseArgs
- Coerce and configuration options to parseArgs

### Changed

- Updated file removal to use del package for safer deletion
- Normalized path returns in fs and Socket directory utilities
- Removed default exports from git and parse-args modules
- Enhanced test coverage across multiple modules (parse-args, prompts, strings, env, spawn, json)

## [1.3.9] - 2025-10-03

### Changed

- Internal build and distribution updates

## [1.3.8] - 2025-10-03

### Added

- Added unified directory structure for Socket ecosystem tools
- New path utilities module for cross-platform directory resolution
- Directory structure constants for Socket CLI, Registry, Firewall, and DLX

## [1.3.7] - 2025-10-02

### Changed

- Updated manifest.json entries

## [1.3.6] - 2025-10-01

### Fixed

- Fixed indent-string interoprability with older v1 and v2 versions

## [1.3.5] - 2025-10-01

### Added

- Added lib/git utilities module

### Fixed

- Fixed invalid manifest entries
- Fixed parseArgs strip-aliased bug

## [1.3.4] - 2025-10-01

### Changed

- Updated various package override versions

## [1.3.3] - 2025-10-01

### Fixed

- Fixed normalizePath collapsing multiple leading `..` segments incorrectly

## [1.3.2] - 2025-10-01

### Added

- Added 'sfw' to isBlessedPackageName method check
- Added ENV.DEBUG normalization for debug package compatibility
  - `DEBUG='1'` or `DEBUG='true'` automatically expands to `DEBUG='*'` (enables all namespaces)
  - `DEBUG='0'` or `DEBUG='false'` automatically converts to empty string (disables all output)
  - Namespace patterns like `DEBUG='app:*'` are preserved unchanged

## [1.3.1] - 2025-09-30

### Changed

- Renamed debug functions from *Complex to *Ns

### Fixed

- Fixed regression with lib/prompts module imports

## [1.3.0] - 2025-09-29

### Changed

- Updated registry subpath exports

### Fixed

- Fixed Node.js built-in module imports in CommonJS output

## [1.2.2] - 2025-09-29

### Changed

- Internal improvements to module structure

## [1.2.1] - 2025-09-29

### Changed

- Restructured constants module with new architecture
- Updated build configuration and package exports
