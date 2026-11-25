import { promises as fs } from 'node:fs'
import path from 'node:path'
import { UTF8 } from '@socketsecurity/lib-stable/constants/encoding'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { readPackageJson } from '@socketsecurity/lib-stable/packages/read'
import { naturalCompare } from '@socketsecurity/lib-stable/sorts/natural'
import { LICENSE, LICENSE_ORIGINAL } from '../../constants/paths.mts'
import {
  TEMPLATE_CJS_BROWSER,
  TEMPLATE_CJS_ESM,
} from '../../constants/templates.mts'
import {
  getLicenseActions,
  getNpmReadmeAction,
  getPackageJsonAction,
  getTypeScriptActions,
  writeAction,
} from '../../util/templates.mts'
import {
  isSubpathExports,
  resolvePackageJsonEntryExports,
} from '@socketsecurity/lib-stable/packages/exports'
import type { EditablePackageJsonInstance } from '@socketsecurity/lib-stable/packages/edit'

import type { TsRef } from './template.mts'

const logger = getDefaultLogger()
export async function writeOverrideFiles(context: {
  templatePkgPath: string
  pkgPath: string
  templateChoice: string
  nodeRange: string | undefined
  tsRefs: TsRef[]
  licenseContents: Array<{ name: string; content: string }>
  nmPkgJson: NonNullable<Awaited<ReturnType<typeof readPackageJson>>>
}): Promise<boolean> {
  const {
    templatePkgPath,
    pkgPath,
    templateChoice,
    nodeRange,
    tsRefs,
    licenseContents,
    nmPkgJson,
  } = context
  const interop = [
    'cjs',
    ...(templateChoice === TEMPLATE_CJS_ESM ? ['esm'] : []),
    ...(templateChoice === TEMPLATE_CJS_BROWSER ? ['browserify'] : []),
  ]

  // First copy the template directory contents to the package path.
  await fs.cp(templatePkgPath, pkgPath, { recursive: true })
  // Then modify the new package's package.json source and write to disk.
  const { PACKAGE_DEFAULT_NODE_RANGE } =
    await import('../../constants/node.mts')
  await writeAction(
    await getPackageJsonAction(pkgPath, {
      engines: {
        node: nodeRange ?? PACKAGE_DEFAULT_NODE_RANGE,
      },
    }),
  )
  // Finally, modify other package file sources and write to disk.
  await Promise.allSettled(
    [
      await getNpmReadmeAction(pkgPath, { interop }),
      ...(await getLicenseActions(pkgPath)),
      ...(await getTypeScriptActions(pkgPath, {
        transform(filepath, data) {
          // Exclude /// <reference types="node" /> from .d.ts files, allowing
          // them in .d.cts files.
          const isCts = filepath.endsWith('.d.cts')
          data['references'] = tsRefs.filter(
            r => isCts || !(r.name === 'types' && r.value === 'node'),
          )
          return data
        },
      })),
    ].map(writeAction),
  )
  return await writeOriginalLicenses(pkgPath, licenseContents, nmPkgJson)
}

async function writeOriginalLicenses(
  pkgPath: string,
  licenseContents: Array<{ name: string; content: string }>,
  nmPkgJson: NonNullable<Awaited<ReturnType<typeof readPackageJson>>>,
): Promise<boolean> {
  // Create LICENSE.original files.
  const { length: licenseCount } = licenseContents
  const filesFieldAdditions: string[] = []
  for (let i = 0; i < licenseCount; i += 1) {
    const licenseContent = licenseContents[i]
    if (!licenseContent) {
      continue
    }
    const { content, name } = licenseContent
    const extRaw = path.extname(name)
    // Omit the .txt extension since licenses are assumed plain text by default.
    const ext = extRaw === '.txt' ? '' : extRaw
    const basename = licenseCount === 1 ? LICENSE : path.basename(name, ext)
    const originalLicenseName = `${basename}.original${ext}`
    if (
      // `npm pack` will automatically include LICENSE{.*,} files so we can
      // exclude them from the package.json "files" field.
      originalLicenseName !== LICENSE_ORIGINAL &&
      originalLicenseName !== `${LICENSE_ORIGINAL}.md`
    ) {
      filesFieldAdditions.push(originalLicenseName)
    }

    await fs.writeFile(path.join(pkgPath, originalLicenseName), content, UTF8)
  }
  if (filesFieldAdditions.length) {
    // Load the freshly written package.json and edit its "exports" and "files" fields.
    const editablePkgJsonResult = await readPackageJson(pkgPath, {
      editable: true,
      normalize: true,
    })
    if (!editablePkgJsonResult) {
      logger.fail(`Failed to load package.json at ${pkgPath}`)
      return false
    }
    const editablePkgJson =
      editablePkgJsonResult as unknown as EditablePackageJsonInstance
    const entryExports = resolvePackageJsonEntryExports(
      editablePkgJson.content.exports,
    )
    const nmEntryExports = resolvePackageJsonEntryExports(nmPkgJson.exports)
    const useNmEntryExports =
      entryExports === undefined && isSubpathExports(nmEntryExports)
    editablePkgJson.update({
      main: useNmEntryExports ? undefined : editablePkgJson.content.main,
      exports: (useNmEntryExports ? nmEntryExports : entryExports) as
        | string
        | string[]
        | Record<string, unknown>
        | undefined,
      files: [
        ...(editablePkgJson.content.files ?? []),
        ...filesFieldAdditions,
      ].toSorted(naturalCompare),
    })
    await editablePkgJson.save()
  }

  return true
}
