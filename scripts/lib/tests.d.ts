declare interface Tests {
  isPackageTestingSkipped(eco: string, regPkgName: string): boolean
}
declare const tests: Tests
export = tests
