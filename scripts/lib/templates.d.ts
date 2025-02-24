/// <reference types="node" />
import { PathLike } from 'node:fs'
import { Content as NPMCliPackageJson } from '@npmcli/package-json'
import { CategoryString, ManifestEntryData } from '@socketsecurity/registry'
import { PackageURL } from '@socketregistry/packageurl-js'
import { SemVer } from 'semver'
import { Remap } from '@socketsecurity/registry/lib/objects'

declare type Action =
  | LicenseAction
  | NpmReadmeAction
  | PackageAction
  | TypeScripAction
declare type LicenseAction = {
  license: string
}
declare type NpmReadmeAction = PackageAction
declare type PackageAction = Remap<
  Omit<NPMCliPackageJson, 'dependencies' | 'version'> &
    ManifestEntryData & {
      adjectivesText: string
      categories: CategoryString[]
      dependencies: { [key: string]: string }
      originalName: string
      purl: PackageURL
      version: SemVer
    }
>
declare type Templates = {
  TEMPLATE_CJS: string
  TEMPLATE_CJS_BROWSER: string
  TEMPLATE_CJS_ESM: string
  TEMPLATE_ES_SHIM_CONSTRUCTOR: string
  TEMPLATE_ES_SHIM_PROTOTYPE_METHOD: string
  TEMPLATE_ES_SHIM_STATIC_METHOD: string
}
declare type TypeScripAction = {
  references: string[]
}
declare type TypeScriptOptions = {
  references?: string[] | undefined
  transform?:
    | ((filepath: string, data: { references: string[] }) => Promise<any>)
    | undefined
}
declare const templatesModule: {
  getLicenseActions(pkgPath: string): Promise<[string, LicenseAction][]>
  getNpmReadmeAction(
    pkgPath: string,
    options?: { interop?: ManifestEntryData['interop'] } | undefined
  ): Promise<[string, NpmReadmeAction][]>
  getPackageJsonAction(
    pkgPath: string,
    options?: { engines?: ManifestEntryData['engines'] } | undefined
  ): Promise<[string, PackageAction][]>
  getTemplate<T extends keyof Templates>(templateName: T): Templates[T]
  getTypeScriptActions(
    pkgPath: string,
    options?: TypeScriptOptions | undefined
  ): Promise<[string, TypeScripAction][]>
  renderAction(action: [PathLike, Action]): Promise<string>
  writeAction(action: [PathLike, Action]): Promise<void>
}
declare namespace TemplatesModule {
  export {
    Action,
    LicenseAction,
    NpmReadmeAction,
    PackageAction,
    Templates,
    TypeScripAction,
    TypeScriptOptions
  }
}
export = TemplatesModule
