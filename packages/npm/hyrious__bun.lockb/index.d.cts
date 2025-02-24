/**
 * Parse and print the `bun.lockb` file in yarn lockfile v1 format.
 * ```js
 * // in Node.js
 * parse(fs.readFileSync('bun.lockb')) //=> "# yarn lockfile v1\n..."
 * // in Browser
 * parse(await file.arrayBuffer())
 * ```
 */
const HyriousBunLockb: {
  parse(buf: Uint8Array | ArrayBuffer): string
}
declare namespace HyriousBunLockb {}
export = HyriousBunLockb
