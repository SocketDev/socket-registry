import {
  Diagnostic,
  FilesConfiguration,
  FixFileMode,
  OpenProjectResult,
  TextRange,
} from '@biomejs/wasm-nodejs'

import { Remap } from '@socketsecurity/registry/lib/objects'

/**
 * What kind of client Biome should use to communicate with the binary
 */
declare enum Distribution {
  /**
   * Use this if you want to communicate with the WebAssembly client built for bundlers
   */
  BUNDLER = 0,
  /**
   * Use this if you want to communicate with the WebAssembly client built for Node.JS
   */
  NODE = 1,
  /**
   * Use this if you want to communicate with the WebAssembly client built for the Web
   */
  WEB = 2,
}
declare interface FormatContentDebugOptions extends FormatContentOptions {
  /**
   * If `true`, you'll be able to inspect the IR of the formatter*/
  debug: boolean
}
declare interface FormatContentOptions {
  /**
   * A virtual path of the file. You should add the extension,
   * so Biome knows how to parse the content
   */
  filePath: string
  /**
   * The range where to format the content
   */
  range?: TextRange
}
declare interface FormatResult {
  /**
   * The new formatted content
   */
  content: string
  /**
   * A series of errors encountered while executing an operation
   */
  diagnostics: Diagnostic[]
}
declare interface FormatDebugResult extends FormatResult {
  /**
   * The IR emitted by the formatter
   */
  ir: string
}
declare interface LintContentOptions {
  /**
   * A virtual path of the file. You should add the extension,
   * so Biome knows how to parse the content
   */
  filePath: string
  fixFileMode?: FixFileMode
}
declare interface LintResult {
  content: string
  diagnostics: Diagnostic[]
}
declare interface BiomeCreate {
  distribution: Distribution
}
declare interface PrintDiagnosticsOptions {
  /**
   * The name of the file to print diagnostics for
   */
  filePath: string
  /**
   * The content of the file the diagnostics were emitted for
   */
  fileSource: string
  /**
   * Whether to print the diagnostics in verbose mode
   */
  verbose?: boolean
}
declare class Biome {
  private readonly module
  private readonly workspace
  private tryCatchWrapper
  private withFile
  private constructor()
  /**
   * It creates a new instance of the class {Biome}.
   */
  static create(options: BiomeCreate): Promise<Biome>
  /**
   * Stop this instance of Biome
   *
   * After calling `shutdown()` on this object, it should be considered
   * unusable as calling any method on it will fail
   */
  shutdown(): void
  /**
   * Allows to apply a custom configuration.
   *
   * If fails when the configuration is incorrect.
   *
   * @param {ProjectKey} projectKey The identifier of the project
   * @param {Configuration} configuration
   */
  applyConfiguration(
    projectKey: number,
    configuration: BiomeFormatOptions,
  ): void
  /**
   * If formats some content.
   *
   * @param {ProjectKey} projectKey The identifier of the project
   * @param {String} content The content to format
   * @param {FormatContentOptions | FormatContentDebugOptions} options Options needed when formatting some content
   */
  formatContent(
    projectKey: number,
    content: string,
    options: FormatContentOptions,
  ): FormatResult
  formatContent(
    projectKey: number,
    content: string,
    options: FormatContentDebugOptions,
  ): FormatDebugResult
  /**
   * Lint the content of a file.
   *
   * @param {ProjectKey} projectKey The identifier of the project
   * @param {String} content The content to lint
   * @param {LintContentOptions} options Options needed when linting some content
   */
  lintContent(
    projectKey: number,
    content: string,
    { filePath, fixFileMode }: LintContentOptions,
  ): LintResult
  /**
   * Open a possible workspace project folder. Returns the key of said project.
   * Use this key when you want to switch to different projects.
   *
   * @param {string} [path]
   */
  openProject(path?: string | undefined): OpenProjectResult
  /**
   * Print a list of diagnostics to an HTML string.
   *
   * @param {Diagnostic[]} diagnostics The list of diagnostics to print
   * @param {PrintDiagnosticsOptions} options Options needed for printing the diagnostics
   */
  printDiagnostics(
    diagnostics: Diagnostic[],
    options: PrintDiagnosticsOptions,
  ): string
}
declare type BiomeFormatOptions = Remap<
  FilesConfiguration & {
    filePath: string
    filepath?: string | undefined
    range?: TextRange
  }
>
declare const BiomeExports: {
  biomeFormat(
    str: string,
    options?: BiomeFormatOptions | undefined,
  ): Promise<string>
  getBiome(): Promise<Biome>
  getDefaultBiomeConfig(): BiomeFormatOptions
}
declare namespace BiomeExports {
  export { BiomeFormatOptions }
}
export = BiomeExports
