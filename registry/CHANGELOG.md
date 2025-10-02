# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
