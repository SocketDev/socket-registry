/**
 * Parse upstream release pins and their hash annotations from .gitmodules.
 */

export interface GitmodulesEntry {
  // Quoted name from `[submodule "<name>"]`.
  name: string
  // 1-based line of the opening `[submodule …]`.
  line: number
  // `path =` value, else undefined.
  path: string | undefined
  // `url =` value, else undefined.
  url: string | undefined
  // `branch =` value, single-branch tracking ref, else undefined.
  branch: string | undefined
  // `ref =` value, the pinned commit SHA, else undefined. For an upstream with
  // no usable release tag this SHA — not `branch` — is the real pin.
  ref: string | undefined
  // True when the block declares `shallow = true`.
  shallow: boolean
  // Non-empty `sparse-checkout =` value, else undefined.
  sparse: string | undefined
  // `sparse-mode = no-cone` selects gitignore-style file patterns.
  sparseMode: string | undefined
  // Convenience mirror of `sparse !== undefined`.
  hasSparse: boolean
  // `verify =` consumer command / the literal `none`, else undefined.
  verify: string | undefined
  // The `# full-checkout: <reason>` reason from the header comment, else
  // undefined.
  fullCheckoutReason: string | undefined
  // The `sha256:<64hex>` archive content-hash from the header comment, else
  // undefined.
  headerSha: string | undefined
  // The canonical header's derived commit date, else undefined.
  headerDate: string | undefined
  // The canonical header prefix before date and hash, else undefined.
  headerPrefix: string | undefined
}

export interface GitmodulesHeaderAnnotations {
  // The `# full-checkout: <reason>` reason, else undefined.
  fullCheckoutReason: string | undefined
  // The `sha256:<64hex>` archive content-hash, else undefined.
  headerSha: string | undefined
  headerDate: string | undefined
  headerPrefix: string | undefined
}

// Scan the contiguous comment lines directly above `openIndex` for a
// full-checkout annotation and the `sha256:` content-hash. Either may sit on
// the `# <name>-<version>` header or on its own comment line, so the scan runs
// backward until it leaves the comment run or has found both.
export function readGitmodulesHeaderAnnotations(
  lines: readonly string[],
  openIndex: number,
): GitmodulesHeaderAnnotations {
  let fullCheckoutReason: string | undefined
  let headerSha: string | undefined
  let headerDate: string | undefined
  let headerPrefix: string | undefined
  for (let j = openIndex - 1; j >= 0; j -= 1) {
    const prev = lines[j]!
    if (!prev.trimStart().startsWith('#')) {
      break
    }
    const m = /#.*\bfull-checkout:\s*(.+?)\s*$/.exec(prev)
    if (m && fullCheckoutReason === undefined) {
      fullCheckoutReason = m[1]
    }
    const sha = /#.*\bsha256:([0-9a-f]{64})\b/.exec(prev)
    if (sha && headerSha === undefined) {
      headerSha = sha[1]
      // Header prefix, optional ISO date in parentheses, and SHA-256 stamp.
      const header =
        /^(#\s+.+?)(?:\s+\((\d{4}-\d{2}-\d{2})\))?\s+sha256:[0-9a-f]{64}\s*$/.exec(
          prev,
        )
      headerPrefix = header?.[1]
      headerDate = header?.[2]
    }
    if (fullCheckoutReason !== undefined && headerSha !== undefined) {
      break
    }
  }
  return { fullCheckoutReason, headerDate, headerPrefix, headerSha }
}

export interface GitmodulesBlockFields {
  branch: string | undefined
  entryPath: string | undefined
  ref: string | undefined
  shallow: boolean
  sparse: string | undefined
  sparseMode: string | undefined
  url: string | undefined
  verify: string | undefined
}

function assignGitmodulesBlockField(
  fields: GitmodulesBlockFields,
  key: string,
  value: string,
): void {
  switch (key) {
    case 'ref':
      fields.ref = value || undefined
      break
    case 'branch':
      fields.branch = value || undefined
      break
    case 'path':
      fields.entryPath = value
      break
    case 'shallow':
      fields.shallow = value === 'true'
      break
    case 'sparse-checkout':
      fields.sparse = value || undefined
      break
    case 'sparse-mode':
      fields.sparseMode = value || undefined
      break
    case 'url':
      fields.url = value
      break
    case 'verify':
      fields.verify = value || undefined
      break
  }
}

// Scan the block body below `openIndex`, up to the next `[` section, for the
// `key = value` config fields the provenance check reads.
export function readGitmodulesBlockFields(
  lines: readonly string[],
  openIndex: number,
): GitmodulesBlockFields {
  const fields: GitmodulesBlockFields = {
    branch: undefined,
    entryPath: undefined,
    ref: undefined,
    shallow: false,
    sparse: undefined,
    sparseMode: undefined,
    url: undefined,
    verify: undefined,
  }
  for (let j = openIndex + 1, { length } = lines; j < length; j += 1) {
    const next = lines[j]!
    if (/^\s*\[/.test(next)) {
      break
    }
    // Match a `key = value` .gitmodules line: capture the key (word chars
    // and hyphens) and the trimmed value on either side of the `=`.
    const kv = /^\s*([\w-]+)\s*=\s*(.*?)\s*$/.exec(next)
    if (!kv) {
      continue
    }
    const key = kv[1]!
    const value = kv[2]!
    assignGitmodulesBlockField(fields, key, value)
  }
  return fields
}

// Parse `.gitmodules` into one entry per submodule. Comment annotations are
// read from the contiguous `#` lines directly above the block; config fields
// are read from the block body up to the next `[` section.
export function parseGitmodules(text: string): GitmodulesEntry[] {
  const lines = text.split(/\r?\n/)
  const entries: GitmodulesEntry[] = []
  for (let i = 0, { length } = lines; i < length; i += 1) {
    const open = /^\s*\[submodule\s+"([^"]+)"\s*\]\s*$/.exec(lines[i]!)
    if (!open) {
      continue
    }
    const { fullCheckoutReason, headerDate, headerPrefix, headerSha } =
      readGitmodulesHeaderAnnotations(lines, i)
    const { branch, entryPath, ref, shallow, sparse, sparseMode, url, verify } =
      readGitmodulesBlockFields(lines, i)
    entries.push({
      name: open[1]!,
      line: i + 1,
      path: entryPath,
      url,
      branch,
      ref,
      shallow,
      sparse,
      sparseMode,
      hasSparse: sparse !== undefined,
      verify,
      fullCheckoutReason,
      headerDate,
      headerPrefix,
      headerSha,
    })
  }
  return entries
}
