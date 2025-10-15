/**
 * Node.js runtime: versions, features, flags, and capabilities.
 */

// Version detection.
export function getNodeVersion(): string {
  return process.version
}

export function getNodeMajorVersion(): number {
  return Number.parseInt(process.version.slice(1).split('.')[0] || '0', 10)
}

// Maintained Node.js versions.
let _maintainedNodeVersions:
  | (readonly string[] & {
      current: string
      last: string
      next: string
      previous: string
    })
  | undefined
export function getMaintainedNodeVersions() {
  if (_maintainedNodeVersions === undefined) {
    try {
      _maintainedNodeVersions = require('../lib/maintained-node-versions')
    } catch {
      _maintainedNodeVersions = Object.freeze(
        Object.assign([], {
          current: '',
          last: '',
          next: '',
          previous: '',
        }),
      ) as typeof _maintainedNodeVersions
    }
  }
  return _maintainedNodeVersions
}

// Feature detection.
export function supportsNodeCompileCacheApi(): boolean {
  const major = getNodeMajorVersion()
  return major >= 24
}

export function supportsNodeCompileCacheEnvVar(): boolean {
  const major = getNodeMajorVersion()
  return major >= 22
}

export function supportsNodeDisableWarningFlag(): boolean {
  const major = getNodeMajorVersion()
  return major >= 21
}

export function supportsNodePermissionFlag(): boolean {
  const major = getNodeMajorVersion()
  return major >= 20
}

export function supportsNodeRequireModule(): boolean {
  const major = getNodeMajorVersion()
  return (
    major >= 23 ||
    (major === 22 &&
      Number.parseInt(process.version.split('.')[1] || '0', 10) >= 12)
  )
}

export function supportsNodeRun(): boolean {
  const major = getNodeMajorVersion()
  return (
    major >= 23 ||
    (major === 22 &&
      Number.parseInt(process.version.split('.')[1] || '0', 10) >= 11)
  )
}

export function supportsProcessSend(): boolean {
  return typeof process.send === 'function'
}

// Node.js flags.
let _nodeDebugFlags: string[]
export function getNodeDebugFlags(): string[] {
  if (_nodeDebugFlags === undefined) {
    _nodeDebugFlags = [
      '--inspect',
      '--inspect-brk',
      '--inspect-port',
      '--inspect-publish-uid',
    ]
  }
  return _nodeDebugFlags
}

let _nodeHardenFlags: string[]
export function getNodeHardenFlags(): string[] {
  if (_nodeHardenFlags === undefined) {
    _nodeHardenFlags = [
      '--disable-proto=delete',
      '--experimental-permission',
      '--experimental-policy',
      '--force-node-api-uncaught-exceptions-policy',
    ]
  }
  return _nodeHardenFlags
}

let _nodeNoWarningsFlags: string[]
export function getNodeNoWarningsFlags(): string[] {
  if (_nodeNoWarningsFlags === undefined) {
    _nodeNoWarningsFlags = ['--no-warnings', '--no-deprecation']
  }
  return _nodeNoWarningsFlags
}

// Execution path.
export function getExecPath(): string {
  return process.execPath
}

// Node.js constants.
export const NODE_SEA_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'
export const ESNEXT = 'esnext'
