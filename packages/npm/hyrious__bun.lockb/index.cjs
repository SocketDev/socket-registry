'use strict'

let _localeCompare
function localeCompare(x, y) {
  if (_localeCompare === undefined) {
    // Lazily call new Intl.Collator() because in Node it can take 10-14ms.
    _localeCompare = new Intl.Collator().compare
  }
  return _localeCompare(x, y)
}

function assert(truthy, message = 'assert failed') {
  if (truthy) {
    return
  }
  throw new TypeError(message)
}

function base64(a) {
  let ret
  if (a.length < 65535) {
    ret = btoa(String.fromCodePoint.apply(String, a))
  } else {
    ret = ''
    for (let value of a) {
      ret += String.fromCodePoint(value)
    }
    ret = btoa(ret)
  }
  return ret
}

function eq(a, b) {
  if (a.byteLength !== b.byteLength) {
    return false
  }
  for (let i = a.byteLength - 1; i >= 0; i--) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

function fmt_hash(a) {
  if (a.byteLength < 32) {
    throw new TypeError('meta_hash too short')
  }
  let hash = ''
  for (let i = 0; i < 32; i += 1) {
    let c = hex(a[i])
    if (i < 8 || (16 <= i && i < 24)) {
      c = c.toUpperCase()
    }
    hash += c
    if (i < 31 && (i + 1) % 8 === 0) {
      hash += '-'
    }
  }
  return hash
}

function fmt_integrity(a) {
  if (a.byteLength < 65) {
    throw new TypeError('integrity too short')
  }
  const tag = a[0]
  a = a.subarray(1)
  let out
  if (tag === 1) {
    out = 'sha1-'
  } else if (tag === 2) {
    out = 'sha256-'
  } else if (tag === 3) {
    out = 'sha384-'
  } else if (tag === 4) {
    out = 'sha512-'
  } else {
    return ''
  }
  out += base64(a)
  return out
}

function fmt_resolution(a, buffers) {
  if (a.byteLength < 64) throw new TypeError('resolution too short')
  const tag = a[0]
  const view2 = new DataView(a.buffer, a.byteOffset, a.byteLength)
  let pos = 8
  if (tag === 2 /* npm */) {
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
      v += '-' + pre
    }
    if (build) {
      v += '+' + build
    }
    return v
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
      buffers
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
    let out =
      tag === 32 /* git */
        ? 'git+'
        : tag === 16 /* github */
          ? 'github:'
          : 'gitlab:'
    let owner = str(
      new Uint8Array(view2.buffer, view2.byteOffset + pos, 8),
      buffers
    )
    let repo = str(
      new Uint8Array(view2.buffer, view2.byteOffset + pos + 8, 8),
      buffers
    )
    if (owner) {
      out += owner + '/'
    } else if (is_scp(repo)) {
      out += 'ssh://'
    }
    out += repo
    pos += 16
    let commitish = str(
      new Uint8Array(view2.buffer, view2.byteOffset + pos, 8),
      buffers
    )
    let resolved = str(
      new Uint8Array(view2.buffer, view2.byteOffset + pos + 8, 8),
      buffers
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
  return ''
}

function fmt_specs(name, specs, version) {
  specs = Array.from(new Set(specs.map(e => e || `^${version}`))).sort()
  let out = ''
  let comma = false
  for (const spec of specs) {
    const item = `${name}@${spec}`
    if (comma) {
      out += ', '
    }
    out += quote(item)
    comma = true
  }
  return `${out}:`
}

function fmt_url(a, buffers) {
  if (a.byteLength < 64) {
    throw new TypeError('resolution too short')
  }
  return a[0] === 2 /* npm */
    ? str(new Uint8Array(a.buffer, a.byteOffset + 8, 8), buffers)
    : fmt_resolution(a, buffers)
}

function hex(a) {
  return (256 + a).toString(16).slice(1)
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

function quote(s) {
  return s.startsWith('true') ||
    s.startsWith('false') ||
    /[:\s\n\\",[\]|\t!]/g.test(s) ||
    /^[0-9]/g.test(s) ||
    !/^[a-zA-Z]/g.test(s)
    ? JSON.stringify(s)
    : s
}

function slice(data, a, item) {
  const { 0: off, 1: length } = to_u32(a)
  return Array.from({ length }, (_, i) =>
    data.subarray(item * off + item * i, item * off + item * i + item)
  )
}

function str(a, buffers) {
  if ((a[7] & 128) === 0) {
    let i = a.indexOf(0)
    if (i >= 0) {
      a = a.subarray(0, i)
    }
    return new TextDecoder().decode(a)
  }
  let [off, len] = to_u32(a)
  len &= ~2147483648
  return new TextDecoder().decode(buffers.string_bytes.subarray(off, off + len))
}

function to_u32(a) {
  if (a.byteOffset % 4 === 0) {
    return new Uint32Array(a.buffer, a.byteOffset, a.byteLength / 4)
  }
  const view2 = new DataView(a.buffer, a.byteOffset, a.byteLength)
  return Uint32Array.from({ length: a.byteLength / 4 }, (_, i) =>
    view2.getUint32(i * 4, true)
  )
}

function parse(buf) {
  let pos = 0
  let view =
    buf instanceof ArrayBuffer
      ? new DataView(buf)
      : new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const header_bytes = new TextEncoder().encode(
    '#!/usr/bin/env bun\nbun-lockfile-format-v0\n'
  )
  const u32 = () => {
    if (pos + 4 > view.byteLength) {
      throw new TypeError('too short')
    }
    return view.getUint32((pos += 4) - 4, true)
  }
  const u64 = () => {
    if (pos + 8 > view.byteLength) {
      throw new TypeError('too short')
    }
    const a = view.getUint32((pos += 4) - 4, true)
    const b = view.getUint32((pos += 4) - 4, true)
    return a + b * 2 ** 32
  }
  const read = n => {
    if (pos + n > view.byteLength) {
      throw new TypeError('too short')
    }
    return new Uint8Array(view.buffer, view.byteOffset + (pos += n) - n, n)
  }
  const header_buf = read(header_bytes.byteLength)
  assert(eq(header_buf, header_bytes), 'invalid lockfile')
  const format = u32()
  assert(format === 2, 'outdated lockfile version')
  const meta_hash = read(32)
  const end = u64()
  assert(end <= view.byteLength, 'lockfile is missing data')
  const list_len = u64()
  assert(
    list_len < 2 ** 32,
    'lockfile validation failed: list is impossibly long'
  )
  const input_alignment = u64()
  assert(input_alignment === 8)
  const field_count = u64()
  assert(field_count === 8)
  const begin_at = u64()
  const end_at = u64()
  assert(
    begin_at <= end && end_at <= end && begin_at <= end_at,
    'lockfile validation failed: invalid package list range'
  )
  pos = begin_at
  const packages = Object.entries({
    name: 8,
    name_hash: 8,
    resolution: 64,
    dependencies: 8,
    resolutions: 8,
    meta: 88,
    bin: 20,
    scripts: 48
  }).reduce(
    (list, [field, len]) => {
      const data = read(len * list_len)
      list.forEach((a, i) => {
        a[field] = data.subarray(i * len, i * len + len)
      })
      return list
    },
    Array.from({ length: list_len }, () => ({}))
  )
  pos = end_at
  const buffers = [
    'trees',
    'hoisted_dependencies',
    'resolutions',
    // u32[]
    'dependencies',
    // name(8) + name_hash(8) + behavior(1) + tag(1) + literal(8) = 26[]
    'extern_strings',
    'string_bytes'
  ].reduce((a, key) => {
    const start = u64()
    const end2 = u64()
    pos = start
    a[key] = read(end2 - start)
    pos = end2
    return a
  }, {})
  const requested_versions = Array(list_len)
  requested_versions[0] = []
  for (let i = 1; i < list_len; i += 1) {
    let resolutions = to_u32(buffers.resolutions.subarray())
    let dependencies = buffers.dependencies.subarray()
    let k = -1
    let all_requested_versions = []
    while ((k = resolutions.indexOf(i)) >= 0) {
      all_requested_versions.push(dependencies.subarray(k * 26, k * 26 + 26))
      dependencies = dependencies.subarray(k * 26 + 26)
      resolutions = resolutions.subarray(k + 1)
    }
    requested_versions[i] = all_requested_versions
  }
  let ResolutionTag
  ;(ResolutionTag2 => {
    ResolutionTag2[(ResolutionTag2['uninitialized'] = 0)] = 'uninitialized'
    ResolutionTag2[(ResolutionTag2['root'] = 1)] = 'root'
    ResolutionTag2[(ResolutionTag2['npm'] = 2)] = 'npm'
    ResolutionTag2[(ResolutionTag2['folder'] = 4)] = 'folder'
    ResolutionTag2[(ResolutionTag2['local_tarball'] = 8)] = 'local_tarball'
    ResolutionTag2[(ResolutionTag2['github'] = 16)] = 'github'
    ResolutionTag2[(ResolutionTag2['gitlab'] = 24)] = 'gitlab'
    ResolutionTag2[(ResolutionTag2['git'] = 32)] = 'git'
    ResolutionTag2[(ResolutionTag2['symlink'] = 64)] = 'symlink'
    ResolutionTag2[(ResolutionTag2['workspace'] = 72)] = 'workspace'
    ResolutionTag2[(ResolutionTag2['remote_tarball'] = 80)] = 'remote_tarball'
    ResolutionTag2[(ResolutionTag2['single_file_module'] = 100)] =
      'single_file_module'
  })(ResolutionTag || (ResolutionTag = {}))
  let out = [
    '# THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.',
    '# yarn lockfile v1',
    `# bun ./bun.lockb --hash: ${fmt_hash(meta_hash)}`,
    ''
  ]
  const order = Array.from({ length: list_len }, (_, i) => i)
    .slice(1)
    .sort((a, b) => {
      const pa = packages[a]
      const pb = packages[b]
      return (
        localeCompare(str(pa.name, buffers), str(pb.name, buffers)) ||
        localeCompare(
          fmt_resolution(pa.resolution, buffers),
          fmt_resolution(pb.resolution, buffers)
        )
      )
    })
  for (const i of order) {
    const a = packages[i]
    const name = str(a.name, buffers)
    const resolution = a.resolution
    const meta = a.meta
    const dependencies = slice(buffers.dependencies, a.dependencies, 26)
    const dependency_versions = requested_versions[i]
    const version = fmt_resolution(resolution, buffers)
    const versions = dependency_versions.map(b =>
      str(b.subarray(18, 18 + 8), buffers)
    )
    const url = fmt_url(resolution, buffers)
    const integrity = fmt_integrity(meta.subarray(20, 85))
    out.push('')
    out.push(fmt_specs(name, versions, version))
    out.push(`  version ${JSON.stringify(version)}`)
    out.push(`  resolved ${JSON.stringify(url)}`)
    if (integrity) {
      out.push(`  integrity ${integrity}`)
    }
    if (dependencies.length > 0) {
      let Behavior
      ;(Behavior2 => {
        Behavior2[(Behavior2['_'] = 0)] = '_'
        Behavior2[(Behavior2['normal'] = 2)] = 'normal'
        Behavior2[(Behavior2['optional'] = 4)] = 'optional'
        Behavior2[(Behavior2['dev'] = 8)] = 'dev'
        Behavior2[(Behavior2['peer'] = 16)] = 'peer'
        Behavior2[(Behavior2['workspace'] = 32)] = 'workspace'
      })(Behavior || (Behavior = {}))
      let behavior = 0 /* _ */
      for (let dependency of dependencies) {
        let dep_behavior = dependency[16]
        if (behavior !== dep_behavior) {
          if ((dep_behavior & 4) /* optional */ > 0) {
            out.push('  optionalDependencies:')
          } else if ((dep_behavior & 2) /* normal */ > 0) {
            out.push('  dependencies:')
          } else if ((dep_behavior & 8) /* dev */ > 0) {
            out.push('  devDependencies:')
          } else continue
          behavior = dep_behavior
        }
        let dep_name = str(dependency.subarray(0, 8), buffers)
        let literal = str(dependency.subarray(18, 18 + 8), buffers)
        out.push(`    ${quote(dep_name)} "${literal}"`)
      }
    }
  }
  out.push('')
  return out.join('\n')
}

module.exports = {
  parse
}
