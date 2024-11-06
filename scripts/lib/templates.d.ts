import { PathLike } from 'node:path'

declare interface LicenseAction {
  license: string
}
declare interface TypeScriptOptions {
  references?: any[]
  transform?: (filepath: string, data: Record<string, any>) => Promise<any>
}
declare function getLicenseActions(
  pkgPath: string
): Promise<[string, LicenseAction][]>
declare function getNpmReadmeAction(
  pkgPath: string
): Promise<[string, Record<string, any>]>
declare function getPackageJsonAction(
  pkgPath: string,
  options?: { engines?: Record<string, string> }
): Promise<[string, Record<string, any>]>
declare function getTypeScriptActions(
  pkgPath: string,
  options?: TypeScriptOptions
): Promise<[string, Record<string, any> | any][]>
declare function renderAction(action: [PathLike, any]): Promise<string>
declare function writeAction(action: [PathLike, any]): Promise<void>
declare const templates: Readonly<Record<string, string>>
declare const spinner: {
  getLicenseActions: typeof getLicenseActions
  getNpmReadmeAction: typeof getNpmReadmeAction
  getPackageJsonAction: typeof getPackageJsonAction
  getTypeScriptActions: typeof getTypeScriptActions
  renderAction: typeof renderAction
  templates: typeof templates
  writeAction: typeof writeAction
}
export = spinner
