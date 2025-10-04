/**
 * @fileoverview Package.json path resolution utilities.
 */

let _path: typeof import('path') | undefined
/**
 * Get the path module.
 */
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path!
}

/**
 * Resolve directory path from a package.json file path.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolvePackageJsonDirname(filepath: string): string {
  if (filepath.endsWith('package.json')) {
    const path = getPath()
    return path.dirname(filepath)
  }
  return filepath
}

/**
 * Resolve full path to package.json from a directory or file path.
 */
/*@__NO_SIDE_EFFECTS__*/
export function resolvePackageJsonPath(filepath: string): string {
  if (filepath.endsWith('package.json')) {
    return filepath
  }
  const path = getPath()
  return path.join(filepath, 'package.json')
}
