import { default as didYouMean, ReturnTypeEnums } from 'didyoumean2'
// oxlint-disable-next-line socket/prefer-lib-versions-over-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'
import { ESNEXT } from '../../constants/core.mts'
import {
  confirm,
  search,
  select,
} from '@socketsecurity/lib-stable/stdio/prompts'
import { naturalSorter } from '@socketsecurity/lib-stable/sorts/natural'
import {
  TEMPLATE_CJS,
  TEMPLATE_CJS_BROWSER,
  TEMPLATE_CJS_ESM,
  TEMPLATE_ES_SHIM_CONSTRUCTOR,
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
  TEMPLATE_ES_SHIM_STATIC_METHOD,
  TS_LIBS_AVAILABLE,
  TS_TYPES_AVAILABLE,
} from '../../constants/templates.mts'
import {
  esShimChoices,
  getCompatData,
  toChoice,
} from '../override-manifest.mts'

interface CompatData {
  spec_url?: string | undefined
  support?:
    | { nodejs?: { version_added?: string | boolean | undefined } | undefined }
    | undefined
}

export interface TsRef {
  name: string
  value: string
}

const tsLibsAvailable = TS_LIBS_AVAILABLE
const tsTypesAvailable = TS_TYPES_AVAILABLE
const possibleTsRefs = [...tsLibsAvailable, ...tsTypesAvailable]
const maxTsRefLength = possibleTsRefs.reduce((n, v) => Math.max(n, v.length), 0)
export async function selectOverrideTemplate(
  origPkgName: string,
  packageType: string | undefined,
  relJsFilepaths: string[],
) {
  const isEsm = packageType === 'module'
  const isEsShim =
    relJsFilepaths.includes('auto.js') &&
    relJsFilepaths.includes('implementation.js') &&
    relJsFilepaths.includes('index.js') &&
    relJsFilepaths.includes('polyfill.js') &&
    relJsFilepaths.includes('shim.js')

  let nodeRange: string | undefined
  let templateChoice: string | undefined
  const tsRefs: TsRef[] = []
  if (isEsShim) {
    const selected = await selectShimTemplate(origPkgName, tsRefs)
    nodeRange = selected.nodeRange
    templateChoice = selected.templateChoice
  } else if (isEsm) {
    templateChoice = TEMPLATE_CJS_ESM
  } else {
    templateChoice = (await select({
      message: 'Pick the package template to use',
      choices: [
        { name: 'cjs', value: TEMPLATE_CJS },
        { name: 'cjs and browser', value: TEMPLATE_CJS_BROWSER },
      ],
    })) as string | undefined
  }
  if (templateChoice === undefined) {
    // Exit if user force closed the prompt.
    return
  }
  if (!tsRefs.length) {
    const answer = await confirm({
      message: 'Need a TypeScript lib/types reference?',
      default: false,
    })
    if (answer === undefined) {
      // Exit if user force closed the prompt.
      return
    }
    if (answer) {
      const searchResult = await search({
        message: 'Which one?',
        source: findTsReferenceChoices,
      })
      if (typeof searchResult !== 'string') {
        // Exit if user force closed the prompt.
        return
      }
      const name = tsLibsAvailable.has(searchResult) ? 'lib' : 'types'
      tsRefs.push({ name, value: searchResult })
    }
  }

  return { __proto__: null, nodeRange, templateChoice, tsRefs }
}

async function selectShimTemplate(origPkgName: string, tsRefs: TsRef[]) {
  const { maintainedNodeVersions } = await import('../../constants/node.mts')
  const { PACKAGE_DEFAULT_NODE_RANGE } =
    await import('../../constants/node.mts')
  const parts = origPkgName
    .split(/[-.]/)
    .filter((p: string) => p !== 'es' && p !== 'helpers')
  const compatData = getCompatData(['javascript', 'builtins', ...parts]) as
    | CompatData
    | undefined
  const rawVersionAdded = compatData?.support?.nodejs?.version_added
  const versionAdded =
    typeof rawVersionAdded === 'string'
      ? rawVersionAdded
      : maintainedNodeVersions.last

  let nodeRange = `>=${maintainedNodeVersions.next}`
  if (!semver.satisfies(versionAdded, nodeRange)) {
    nodeRange = `>=${maintainedNodeVersions.current}`
    if (!semver.satisfies(versionAdded, nodeRange)) {
      nodeRange = PACKAGE_DEFAULT_NODE_RANGE
    }
  }
  if (nodeRange !== PACKAGE_DEFAULT_NODE_RANGE) {
    tsRefs.push({ name: 'lib', value: ESNEXT })
  }
  const templateChoice = await resolveShimTemplateChoice(
    parts,
    compatData?.spec_url?.toLowerCase() ?? '',
  )
  return { __proto__: null, nodeRange, templateChoice }
}

export async function findTsReferenceChoices(term: string | undefined) {
  if (!term) {
    return []
  }
  // Trim, truncate, and lower input.
  const formatted = term.trim().slice(0, maxTsRefLength).toLowerCase()
  if (!formatted) {
    return [term]
  }
  let matches: string[] | undefined
  // Simple search.
  for (const p of ['es2', 'es', 'e', 'de', 'd', 'n', 'w']) {
    if (term.startsWith(p) && term.length <= 3) {
      matches = possibleTsRefs.filter(l => l.startsWith(p))
      break
    }
  }
  if (matches === undefined) {
    // Advanced closest match search.
    matches = didYouMean(formatted, possibleTsRefs, {
      caseSensitive: true,
      deburr: false,
      returnType: ReturnTypeEnums.ALL_CLOSEST_MATCHES,
      threshold: 0.2,
    })
  }
  if (!matches.length) {
    return [toChoice(term)]
  }
  const firstMatch = matches[0]!
  const sortedTail =
    matches.length > 1 ? naturalSorter(matches.slice(1)).desc() : []
  // If a match starts with input then don't include input in the results.
  if (matches.some(m => m.startsWith(term))) {
    return [firstMatch, ...sortedTail].map(toChoice)
  }
  let first = firstMatch
  let second = term
  if (term.length > firstMatch.length) {
    first = term
    second = firstMatch
  }
  return [first, second, ...sortedTail].map(toChoice)
}

async function resolveShimTemplateChoice(
  parts: string[],
  loweredSpecUrl: string,
): Promise<string | undefined> {
  let templateChoice: string | undefined
  if (
    (parts.length === 3 &&
      (parts[1] === 'proto' || parts[1] === 'prototype')) ||
    loweredSpecUrl.includes(`${parts[0]}.prototype`)
  ) {
    templateChoice = TEMPLATE_ES_SHIM_PROTOTYPE_METHOD
  } else if (
    parts.length === 2 ||
    loweredSpecUrl.includes(`${parts[0]}.${parts.at(-1)}`)
  ) {
    templateChoice = TEMPLATE_ES_SHIM_STATIC_METHOD
  } else if (
    parts.length === 1 ||
    loweredSpecUrl.includes(`${parts[0]}-constructor`)
  ) {
    templateChoice = TEMPLATE_ES_SHIM_CONSTRUCTOR
  } else {
    templateChoice = (await select({
      message: 'Pick the es-shim template to use',
      choices: esShimChoices,
    })) as string | undefined
  }
  return templateChoice
}
