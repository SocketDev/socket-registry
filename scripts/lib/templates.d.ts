import { PathLike } from 'node:path'
import { Content as NPMCliPackageJson } from '@npmcli/package-json'
import { CategoryString, ManifestEntryData } from '@socketsecurity/registry'
import { PackageURL } from '@socketregistry/packageurl-js'
import { SemVer } from 'semver'

declare type LicenseAction = {
  license: string
}
declare type PackageAction = Omit<
  NPMCliPackageJson,
  'dependencies' | 'version'
> &
  ManifestEntryData & {
    adjectivesText: string
    categories: CategoryString[]
    dependencies: { [key: string]: string }
    originalName: string
    purl: PackageURL
    version: SemVer
  }
declare type NpmReadmeAction = PackageAction
declare type TypeScripAction = {
  references: string[]
}
declare interface TypeScriptOptions {
  references?: string[] | undefined
  transform?:
    | ((filepath: string, data: { references: string[] }) => Promise<any>)
    | undefined
}
declare type Action =
  | LicenseAction
  | NpmReadmeAction
  | PackageAction
  | TypeScripAction
declare type Templates = {
  TEMPLATE_CJS: string
  TEMPLATE_CJS_BROWSER: string
  TEMPLATE_CJS_ESM: string
  TEMPLATE_ES_SHIM_CONSTRUCTOR: string
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD: string
  TEMPLATE_ES_SHIM_STATIC_METHOD: string
}
declare function getLicenseActions(
  pkgPath: string
): Promise<[string, LicenseAction][]>
declare function getNpmReadmeAction(
  pkgPath: string,
  options?: { interop?: ManifestEntryData.interop } | undefined
): Promise<[string, NpmReadmeAction][]>
declare function getPackageJsonAction(
  pkgPath: string,
  options?: { engines?: ManifestEntryData.engines } | undefined
): Promise<[string, PackageAction][]>
declare function getTypeScriptActions(
  pkgPath: string,
  options?: TypeScriptOptions | undefined
): Promise<[string, TypeScripAction][]>
declare function renderAction(action: [PathLike, Action]): Promise<string>
declare function writeAction(action: [PathLike, Action]): Promise<void>
declare function getTemplate<T extends keyof Templates>(
  templateName: T
): Templates[T]
declare const spinner: {
  getLicenseActions: typeof getLicenseActions
  getNpmReadmeAction: typeof getNpmReadmeAction
  getPackageJsonAction: typeof getPackageJsonAction
  getTemplate: typeof getTemplate
  getTypeScriptActions: typeof getTypeScriptActions
  renderAction: typeof renderAction
  writeAction: typeof writeAction
}
export = spinner
