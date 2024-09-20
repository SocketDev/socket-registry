import {
  relPackagesPath,
  rootPath
  // @ts-ignore
} from '@socketregistry/scripts/constants'
import {
  gitStagedFilesSync
  // @ts-ignore
} from '@socketregistry/scripts/utils/git'
import {
  getGlobMatcher
  // @ts-ignore
} from '@socketregistry/scripts/utils/path'

const packagesPathMatcher = getGlobMatcher([`${relPackagesPath}/**`], { cwd: rootPath })

export function hasTestFilesChanges(): boolean {
  const stagedFiles: string[] = gitStagedFilesSync()
  return stagedFiles.some((rel) => packagesPathMatcher(rel))
}
