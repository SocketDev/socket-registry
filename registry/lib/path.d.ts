/// <reference types="node" />
import { PathLike } from 'node:fs'

declare const Path: {
  isNodeModules(pathLike: PathLike): boolean
  isRelative(pathLike: PathLike): boolean
  normalizePath(pathLike: PathLike): string
  pathLikeToString(pathLike: PathLike): string
  splitPath(pathLike: PathLike): string[]
  trimLeadingDotSlash(pathLike: PathLike): string
}
declare namespace Path {}
export = Path
