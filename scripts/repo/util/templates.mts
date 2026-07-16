/**
 * @file Package template generation utilities for Socket registry. Provides
 *   template-based package creation and code generation functions.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { PackageURL } from '@socketregistry/packageurl-js-stable'

import registryManifest from '../../../registry/manifest.json' with { type: 'json' }
import { joinAnd } from '@socketsecurity/lib-stable/arrays/join'
import { globStreamLicenses } from '@socketsecurity/lib-stable/globs/stream'
import { isObject } from '@socketsecurity/lib-stable/objects/predicates'
import { resolveOriginalPackageName } from '@socketsecurity/lib-stable/packages/normalize'
import { readPackageJson } from '@socketsecurity/lib-stable/packages/read'
import { determineArticle } from '@socketsecurity/lib-stable/words/article'
import { capitalize } from '@socketsecurity/lib-stable/words/capitalize'
import { Eta } from 'eta'
import fastGlob from 'fast-glob'
// oxlint-disable-next-line socket/prefer-stable-external-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'

import { UTF8 } from '@socketsecurity/lib-stable/constants/encoding'
import {
  NPM,
  NPM_TEMPLATES_PATH,
  PACKAGE_JSON,
  README_MD,
} from '../../constants/paths.mts'
import {
  TEMPLATE_CJS,
  TEMPLATE_CJS_BROWSER,
  TEMPLATE_CJS_ESM,
  TEMPLATE_ES_SHIM_CONSTRUCTOR,
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
  TEMPLATE_ES_SHIM_STATIC_METHOD,
} from '../../constants/templates.mts'
import { getLicenseContent } from '../../constants/utils.mts'
import { biomeFormat } from './biome.mts'
import type {
  ManifestEntry,
  ManifestEntryData,
  RegistryManifest,
} from './manifest-types.mts'

// File extension constants.
const EXT_JSON = '.json'
const EXT_MD = '.md'

// Package default constants from registry manifest.
const PACKAGE_DEFAULT_NODE_RANGE = '>=24'
const PACKAGE_DEFAULT_SOCKET_CATEGORIES = Object.freeze(['levelup', 'tuneup'])
const PACKAGE_DEFAULT_VERSION = '1.0.0'

type TemplateActionData = Record<string, unknown>
type TemplateAction = [
  string,
  TemplateActionData | (() => TemplateActionData | Promise<TemplateActionData>),
]

const typedRegistryManifest = registryManifest as unknown as RegistryManifest

/**
 * Get manifest data from the registry manifest.json.
 */
export function getManifestData(): RegistryManifest
export function getManifestData(ecosystem: string): ManifestEntry[] | undefined
export function getManifestData(
  ecosystem: string,
  packageName: string,
): ManifestEntryData | undefined
export function getManifestData(
  ecosystem?: string,
  packageName?: string,
): RegistryManifest | ManifestEntry[] | ManifestEntryData | undefined {
  if (!ecosystem) {
    return typedRegistryManifest
  }
  const ecoData = typedRegistryManifest[ecosystem]
  if (!ecoData) {
    return undefined
  }
  if (!packageName) {
    return ecoData
  }
  const entry = ecoData.find(([, data]) => data.package === packageName)
  return entry ? entry[1] : undefined
}

let eta: Eta | undefined
export async function getEta(): Promise<Eta> {
  if (!eta) {
    eta = new Eta()
  }
  return eta
}

let templates: Record<string, string> | undefined
export function getTemplates(): Record<string, string> {
  if (templates === undefined) {
    templates = Object.freeze(
      Object.fromEntries(
        [
          TEMPLATE_CJS,
          TEMPLATE_CJS_BROWSER,
          TEMPLATE_CJS_ESM,
          TEMPLATE_ES_SHIM_CONSTRUCTOR,
          TEMPLATE_ES_SHIM_PROTOTYPE_METHOD,
          TEMPLATE_ES_SHIM_STATIC_METHOD,
        ].map((k): [string, string] => [k, path.join(NPM_TEMPLATES_PATH, k)]),
      ),
    )
  }
  return templates
}

/**
 * Retrieve template path by name.
 */
function getTemplate(name: string): string | undefined {
  return getTemplates()[name]
}

/**
 * Generate actions for copying license files to package.
 */
async function getLicenseActions(pkgPath: string): Promise<TemplateAction[]> {
  const LICENSE_CONTENT = getLicenseContent()
  const licenseData = {
    __proto__: null,
    license: LICENSE_CONTENT,
  }
  const actions: TemplateAction[] = []
  for await (const filepath of globStreamLicenses(pkgPath, {
    recursive: true,
  })) {
    actions.push([String(filepath), licenseData])
  }
  return actions
}

/**
 * Generate action for creating package README with rendered template.
 */
async function getNpmReadmeAction(
  pkgPath: string,
  options?: { interop?: string[] | undefined },
): Promise<TemplateAction> {
  const opts = { __proto__: null, ...options }
  const { interop } = opts
  const eco = NPM
  const pkgJsonPath = path.join(pkgPath, PACKAGE_JSON)
  const pkgJson = await readPackageJson(pkgJsonPath, { normalize: true })
  if (!pkgJson) {
    throw new Error(`Package.json not found at ${pkgJsonPath}`)
  }
  const pkgPurlObj = PackageURL.fromString(
    `pkg:${eco}/${pkgJson.name}@${pkgJson.version}`,
  )
  const { name: sockRegPkgName } = pkgPurlObj
  if (!sockRegPkgName) {
    throw new Error(`Unable to resolve package name for ${pkgPath}`)
  }
  const manifestData = getManifestData(eco, sockRegPkgName)
  const categories = Array.isArray(manifestData?.categories)
    ? manifestData.categories
    : [...PACKAGE_DEFAULT_SOCKET_CATEGORIES]
  const adjectives = [
    ...(categories.includes('speedup') ? ['fast'] : []),
    ...(categories.includes('levelup') ? ['enhanced'] : []),
    ...(categories.includes('tuneup') ? ['secure'] : []),
    'tested',
  ]
  const firstAdjective = adjectives[0] ?? 'tested'
  return [
    path.join(pkgPath, README_MD),
    {
      __proto__: null,
      readme: await renderAction([
        path.join(NPM_TEMPLATES_PATH, README_MD),
        {
          __proto__: null,
          ...manifestData,
          ...pkgJson,
          ...(interop ? { interop } : {}),
          adjectivesText: `${capitalize(determineArticle(firstAdjective))} ${joinAnd(adjectives)}`,
          categories,
          dependencies: isObject(pkgJson.dependencies)
            ? pkgJson.dependencies
            : {},
          originalName: resolveOriginalPackageName(sockRegPkgName),
          purl: pkgPurlObj,
          version: semver.parse(pkgJson.version),
        },
      ]),
    },
  ]
}

/**
 * Generate action for creating or updating package.json.
 */
async function getPackageJsonAction(
  pkgPath: string,
  options?: { engines?: Record<string, string> | undefined },
): Promise<TemplateAction> {
  const opts = { __proto__: null, ...options }
  const { engines } = opts
  const eco = NPM
  const sockRegPkgName = path.basename(pkgPath)
  const manifestData = getManifestData(eco, sockRegPkgName)
  const categories = manifestData?.categories
  return [
    path.join(pkgPath, PACKAGE_JSON),
    {
      __proto__: null,
      ...manifestData,
      name: sockRegPkgName,
      originalName: resolveOriginalPackageName(sockRegPkgName),
      categories: Array.isArray(categories)
        ? categories
        : Array.from(PACKAGE_DEFAULT_SOCKET_CATEGORIES),
      engines: engines ?? { node: PACKAGE_DEFAULT_NODE_RANGE },
      version: semver.parse(manifestData?.version ?? PACKAGE_DEFAULT_VERSION),
    },
  ]
}

/**
 * Generate actions for processing TypeScript definition files.
 */
async function getTypeScriptActions(
  pkgPath: string,
  options?: {
    references?: unknown[] | undefined
    transform?:
      | ((
          filepath: string,
          data: TemplateActionData,
        ) => TemplateActionData | Promise<TemplateActionData>)
      | undefined
  },
): Promise<TemplateAction[]> {
  const opts = { __proto__: null, ...options }
  const { references, transform } = opts
  const doTransform = typeof transform === 'function'
  const filepaths = await fastGlob.glob(['**/*.{[cm],}ts'], {
    absolute: true,
    cwd: pkgPath,
  })
  const actions: TemplateAction[] = []
  await Promise.allSettled(
    filepaths.map(async filepath => {
      const data = {
        __proto__: null,
        references: Array.isArray(references) ? references : [],
      }
      actions.push([
        filepath,
        doTransform && transform ? await transform(filepath, data) : data,
      ])
    }),
  )
  return actions
}

/**
 * Preprocess template content by unwrapping encoded tags and stripping
 * comments.
 */
export function prepareTemplate(content: string): string {
  return (
    content
      // Replace strings that look like "//_ <%...%>" with <%...%>.
      // Enquoting the tags avoids syntax errors in JSON template files.
      // Regex: (1) an opening quote ' or ", then the literal `//_` + optional
      // space, (2) the EJS tag `<%…%>` (with optional -/_/=/~ modifiers), then
      // a backreference \1 to the SAME closing quote.
      .replace(
        /(["'])\/\/_\s*(<%[-_]?[=~]?[\s\S]+%>)\1/g,
        (...groups: string[]) => groups[2] ?? '',
      )
      // Strip single line comments start with //_
      .replace(/\/\/_\s*/g, '')
  )
}

/**
 * Render a template action using Eta and format output.
 */
async function renderAction(action: TemplateAction): Promise<string> {
  const { 0: filepath, 1: dataRaw } = action
  const data = typeof dataRaw === 'function' ? await dataRaw() : dataRaw
  const ext = path.extname(filepath)
  const content = await fs.readFile(filepath, UTF8)
  const prepared = prepareTemplate(content)
  const etaInstance = await getEta()
  const modified = await etaInstance.renderStringAsync(prepared, data)
  return ext === EXT_JSON || ext === EXT_MD
    ? await biomeFormat(modified, { filepath })
    : modified
}

/**
 * Render and write a template action to disk.
 */
async function writeAction(action: TemplateAction): Promise<void> {
  const { 0: filepath } = action
  await fs.writeFile(filepath, await renderAction(action), UTF8)
}

export {
  getLicenseActions,
  getNpmReadmeAction,
  getPackageJsonAction,
  getTemplate,
  getTypeScriptActions,
  renderAction,
  writeAction,
}
