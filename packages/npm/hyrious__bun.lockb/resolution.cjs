'use strict'

const { str } = require('./binary.cjs')

function fmt_git_resolution(tag, view2, buffers, pos) {
  let out =
    tag === 32 /* git */
      ? 'git+'
      : tag === 16 /* github */
        ? 'github:'
        : 'gitlab:'
  const owner = str(
    new Uint8Array(view2.buffer, view2.byteOffset + pos, 8),
    buffers,
  )
  const repo = str(
    new Uint8Array(view2.buffer, view2.byteOffset + pos + 8, 8),
    buffers,
  )
  if (owner) {
    out += `${owner}/`
  } else if (is_scp(repo)) {
    out += 'ssh://'
  }
  out += repo
  pos += 16
  const commitish = str(
    new Uint8Array(view2.buffer, view2.byteOffset + pos, 8),
    buffers,
  )
  let resolved = str(
    new Uint8Array(view2.buffer, view2.byteOffset + pos + 8, 8),
    buffers,
  )
  if (resolved) {
    out += '#'
    let i = -1
    if ((i = resolved.lastIndexOf('-')) >= 0) {
      resolved = resolved.slice(i + 1)
    }
    out += resolved
  } else if (commitish) {
    out += `#${commitish}`
  }
  return out
}

function fmt_npm_resolution(view2, buffers, pos) {
  pos += 8
  const major = view2.getUint32((pos += 4) - 4, true)
  const minor = view2.getUint32((pos += 4) - 4, true)
  const patch = view2.getUint32((pos += 4) - 4, true)
  pos += 4
  const version_tag = new Uint8Array(view2.buffer, view2.byteOffset + pos, 32)
  const pre = str(version_tag.subarray(0, 8), buffers)
  const build = str(version_tag.subarray(16, 24), buffers)
  let v = `${major}.${minor}.${patch}`
  if (pre) {
    v += `-${pre}`
  }
  if (build) {
    v += `+${build}`
  }
  return v
}

function fmt_resolution(a, buffers) {
  if (a.byteLength < 64) {
    throw new TypeError('resolution too short')
  }
  const tag = a[0]
  const view2 = new DataView(a.buffer, a.byteOffset, a.byteLength)
  const pos = 8
  if (tag === 2 /* npm */) {
    return fmt_npm_resolution(view2, buffers, pos)
  }
  if (
    tag === 4 /* folder */ ||
    tag === 8 /* local_tarball */ ||
    tag === 80 /* remote_tarball */ ||
    tag === 72 /* workspace */ ||
    tag === 64 /* symlink */ ||
    tag === 100 /* single_file_module */
  ) {
    let v = str(
      new Uint8Array(view2.buffer, view2.byteOffset + pos, 8),
      buffers,
    )
    if (tag === 72 /* workspace */) {
      v = `workspace:${v}`
    }
    if (tag === 64 /* symlink */) {
      v = `link:${v}`
    }
    if (tag === 100 /* single_file_module */) {
      v = `module:${v}`
    }
    return v
  }
  if (
    tag === 32 /* git */ ||
    tag === 16 /* github */ ||
    tag === 24 /* gitlab */
  ) {
    return fmt_git_resolution(tag, view2, buffers, pos)
  }
  return ''
}

function fmt_url(a, buffers) {
  if (a.byteLength < 64) {
    throw new TypeError('resolution too short')
  }
  return a[0] === 2 /* npm */
    ? str(new Uint8Array(a.buffer, a.byteOffset + 8, 8), buffers)
    : fmt_resolution(a, buffers)
}

function is_scp(s) {
  if (s.length < 3) {
    return false
  }
  let at = -1
  for (let i = 0, { length } = s; i < length; i += 1) {
    if (s[i] === '@') {
      if (at < 0) {
        at = i
      }
    } else if (s[i] === ':') {
      if (s.slice(i).startsWith('://')) {
        return false
      }
      return at >= 0 ? i > at + 1 : i > 0
    } else if (s[i] === '/') {
      return at >= 0 && i > at + 1
    }
  }
  return false
}

module.exports = { fmt_resolution, fmt_url }
