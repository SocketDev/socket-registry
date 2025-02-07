declare interface Tests {
  isPackageTestingSkipped(eco: string, sockRegPkgName: string): boolean
}
declare const tests: Tests
export = tests
