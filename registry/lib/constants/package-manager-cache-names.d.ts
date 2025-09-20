interface PackageManagerCacheNames {
  readonly NPM_CACHE_DIR: '.npm'
  readonly PNPM_STORE_DIR: 'pnpm'
  readonly YARN_CLASSIC_CACHE_DIR: 'yarn'
  readonly YARN_BERRY_CACHE_DIR: '.yarn/cache'
  readonly BUN_CACHE_DIR: 'bun'
  readonly VLT_CACHE_DIR: 'vlt'
}
declare const packageManagerCacheNames: PackageManagerCacheNames
export = packageManagerCacheNames
