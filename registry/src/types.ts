/**
 * @fileoverview Type definitions for Socket Registry.
 */

// Type definitions
enum Categories {
  CLEANUP = 'cleanup',
  LEVELUP = 'levelup',
  SPEEDUP = 'speedup',
  TUNEUP = 'tuneup',
}

export type CategoryString = `${Categories}`

enum Interop {
  BROWSERIFY = 'browserify',
  CJS = 'cjs',
  ESM = 'esm',
}

export type InteropString = `${Interop}`

// Based on SocketPURL_Type from socket-sdk-js
enum PURL_Type {
  APK = 'apk',
  BITBUCKET = 'bitbucket',
  COCOAPODS = 'cocoapods',
  CARGO = 'cargo',
  CHROME = 'chrome',
  COMPOSER = 'composer',
  CONAN = 'conan',
  CONDA = 'conda',
  CRAN = 'cran',
  DEB = 'deb',
  DOCKER = 'docker',
  GEM = 'gem',
  GENERIC = 'generic',
  GITHUB = 'github',
  GOLANG = 'golang',
  HACKAGE = 'hackage',
  HEX = 'hex',
  HUGGINGFACE = 'huggingface',
  MAVEN = 'maven',
  MLFLOW = 'mlflow',
  NPM = 'npm',
  NUGET = 'nuget',
  OCI = 'oci',
  PUB = 'pub',
  PYPI = 'pypi',
  QPKG = 'qpkg',
  RPM = 'rpm',
  SWID = 'swid',
  SWIFT = 'swift',
  VCS = 'vcs',
}

export type PURLString = `${PURL_Type}`
