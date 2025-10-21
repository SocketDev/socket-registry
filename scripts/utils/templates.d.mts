/// <reference types="node" />
import { PathLike } from 'node:fs'

import { Content as NPMCliPackageJson } from '@npmcli/package-json'
import { SemVer } from 'semver'

import { PackageURL } from '@socketregistry/packageurl-js'
import { CategoryString, ManifestEntryData } from '@socketsecurity/registry'
import { Remap } from '@socketsecurity/lib/objects'

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
  references: string[] | readonly string[]
}
declare type TypeScriptOptions = {
  references?: string[] | readonly string[] | undefined
  transform?:
    | ((
        filepath: string,
        data: { references: string[] | readonly string[] },
        // biome-ignore lint/suspicious/noExplicitAny: Transform function can return any type.
      ) => Promise<any>)
    | undefined
}
declare namespace TemplatesModule {
  function getLicenseActions(
    pkgPath: string,
  ): Promise<Array<[string, LicenseAction]>>
  function getNpmReadmeAction(
    pkgPath: string,
    options?: { interop?: ManifestEntryData['interop'] } | undefined,
  ): Promise<Array<[string, NpmReadmeAction]>>
  function getPackageJsonAction(
    pkgPath: string,
    options?: { engines?: ManifestEntryData['engines'] } | undefined,
  ): Promise<Array<[string, PackageAction]>>
  function getTemplate<T extends keyof Templates>(templateName: T): Templates[T]
  function getTypeScriptActions(
    pkgPath: string,
    options?: TypeScriptOptions | undefined,
  ): Promise<Array<[string, TypeScripAction]>>
  function renderAction(action: [PathLike, Action]): Promise<string>
  function writeAction(action: [PathLike, Action]): Promise<void>
  export {
    Action,
    LicenseAction,
    NpmReadmeAction,
    PackageAction,
    Templates,
    TypeScripAction,
    TypeScriptOptions,
  }
}
export = TemplatesModule
