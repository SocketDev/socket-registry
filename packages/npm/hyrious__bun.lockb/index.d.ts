/**
 * Parse and print the `bun.lockb` file in yarn lockfile v1 format.
 * ```js
 * // in Node.js
 * parse(fs.readFileSync('bun.lockb')) //=> "# yarn lockfile v1\n..."
 * // in Browser
 * parse(await file.arrayBuffer())
 * ```
 */
declare function parse(buf: Uint8Array | ArrayBuffer): string

export { parse }
