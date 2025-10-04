import { describe, expect, it } from 'vitest'

import {
  getFastSort,
  getSemver,
  resetBuildToolsDependencies,
  setFastSort,
  setSemver,
} from '../../registry/dist/lib/dependencies/build-tools.js'
import {
  getCacache,
  getDel,
  getFastGlob,
  getPicomatch,
  resetFileSystemDependencies,
  setCacache,
  setDel,
  setFastGlob,
  setPicomatch,
} from '../../registry/dist/lib/dependencies/file-system.js'
import { resetDependencies } from '../../registry/dist/lib/dependencies/index.js'
import {
  getDebug,
  getIsUnicodeSupported,
  getLogger,
  getSpinner,
  getYoctoSpinner,
  getYoctocolors,
  resetLoggingDependencies,
  setDebug,
  setIsUnicodeSupported,
  setLogger,
  setSpinner,
  setYoctoSpinner,
  setYoctocolors,
} from '../../registry/dist/lib/dependencies/logging.js'
import {
  getLibnpmpack,
  getMakeFetchHappen,
  getNormalizePackageData,
  getNpmPackageArg,
  getPackageJson,
  getPackageUrl,
  getPacote,
  getReadPackageJson,
  getSortPackageJson,
  resetNpmToolsDependencies,
  setLibnpmpack,
  setMakeFetchHappen,
  setNormalizePackageData,
  setNpmPackageArg,
  setPackageJson,
  setPackageUrl,
  setPacote,
  setReadPackageJson,
  setSortPackageJson,
} from '../../registry/dist/lib/dependencies/npm-tools.js'
import {
  getInquirerConfirm,
  getInquirerInput,
  getInquirerPassword,
  getInquirerSearch,
  getInquirerSelect,
  resetPromptsDependencies,
  setInquirerConfirm,
  setInquirerInput,
  setInquirerPassword,
  setInquirerSearch,
  setInquirerSelect,
} from '../../registry/dist/lib/dependencies/prompts.js'
import {
  getPromiseSpawn,
  getStreamingIterables,
  getWhich,
  resetSystemDependencies,
  setPromiseSpawn,
  setStreamingIterables,
  setWhich,
} from '../../registry/dist/lib/dependencies/system.js'
import {
  getSpdxCorrect,
  getSpdxExpressionParse,
  getValidateNpmPackageName,
  resetValidationDependencies,
  setSpdxCorrect,
  setSpdxExpressionParse,
  setValidateNpmPackageName,
} from '../../registry/dist/lib/dependencies/validation.js'

import type {
  FastSort,
  Semver,
} from '../../registry/dist/lib/dependencies/build-tools.js'
import type {
  Cacache,
  Del,
  FastGlob,
  Picomatch,
} from '../../registry/dist/lib/dependencies/file-system.js'
import type {
  DebugJs,
  IsUnicodeSupported,
  Logger,
  Spinner,
  YoctoSpinner,
  Yoctocolors,
} from '../../registry/dist/lib/dependencies/logging.js'
import type {
  Libnpmpack,
  MakeFetchHappen,
  NormalizePackageData,
  NpmPackageArg,
  PackageJsonConstructor,
  PackageUrl,
  Pacote,
  ReadPackageJson,
  SortPackageJson,
} from '../../registry/dist/lib/dependencies/npm-tools.js'
import type {
  InquirerConfirm,
  InquirerInput,
  InquirerPassword,
  InquirerSearch,
  InquirerSelect,
} from '../../registry/dist/lib/dependencies/prompts.js'
import type {
  PromiseSpawn,
  StreamingIterables,
  Which,
} from '../../registry/dist/lib/dependencies/system.js'
import type {
  SpdxCorrect,
  SpdxExpressionParse,
  ValidateNpmPackageName,
} from '../../registry/dist/lib/dependencies/validation.js'

const mockIsUnicodeSupported: IsUnicodeSupported = () => true
const mockSpdxCorrect: SpdxCorrect = () => 'mocked'
const mockSpdxExpressionParse: SpdxExpressionParse = () => ({
  license: 'mocked',
})
const mockValidateNpmPackageName: ValidateNpmPackageName = () => ({
  validForNewPackages: true,
  validForOldPackages: true,
})

describe('dependencies/build-tools', () => {
  it('getFastSort loads and returns fast-sort', () => {
    resetBuildToolsDependencies()
    const fastSort = getFastSort()
    expect(fastSort).toBeDefined()
    expect(typeof fastSort.sort).toBe('function')
  })

  it('getSemver loads and returns semver', () => {
    resetBuildToolsDependencies()
    const semver = getSemver()
    expect(semver).toBeDefined()
    expect(typeof semver.valid).toBe('function')
    expect(typeof semver.satisfies).toBe('function')
  })

  it('setFastSort allows dependency injection', () => {
    const mockFastSort = { sort: () => ({}) } as unknown as FastSort
    setFastSort(mockFastSort)
    expect(getFastSort()).toBe(mockFastSort)
    resetBuildToolsDependencies()
  })

  it('setSemver allows dependency injection', () => {
    const mockSemver = { valid: () => null } as unknown as Semver
    setSemver(mockSemver)
    expect(getSemver()).toBe(mockSemver)
    resetBuildToolsDependencies()
  })

  it('resetBuildToolsDependencies forces reload', () => {
    const mockSemver = { valid: () => null } as unknown as Semver
    setSemver(mockSemver)
    resetBuildToolsDependencies()
    const reloaded = getSemver()
    expect(reloaded).not.toBe(mockSemver)
    expect(typeof reloaded.valid).toBe('function')
  })
})

describe('dependencies/file-system', () => {
  it('getCacache loads and returns cacache', () => {
    resetFileSystemDependencies()
    const cacache = getCacache()
    expect(cacache).toBeDefined()
    expect(typeof cacache.get).toBe('function')
  })

  it('getDel loads and returns del', () => {
    resetFileSystemDependencies()
    const del = getDel()
    expect(del).toBeDefined()
    expect(typeof del.deleteAsync).toBe('function')
    expect(typeof del.deleteSync).toBe('function')
  })

  it('getFastGlob loads and returns fast-glob', () => {
    resetFileSystemDependencies()
    const fastGlob = getFastGlob()
    expect(fastGlob).toBeDefined()
    expect(typeof fastGlob).toBe('function')
  })

  it('getPicomatch loads and returns picomatch', () => {
    resetFileSystemDependencies()
    const picomatch = getPicomatch()
    expect(picomatch).toBeDefined()
    expect(typeof picomatch).toBe('function')
  })

  it('setCacache allows dependency injection', () => {
    const mockCacache = { get: () => {} } as unknown as Cacache
    setCacache(mockCacache)
    expect(getCacache()).toBe(mockCacache)
    resetFileSystemDependencies()
  })

  it('setDel allows dependency injection', () => {
    const mockDel: Del = {
      deleteAsync: async () => [],
      deleteSync: () => [],
    }
    setDel(mockDel)
    expect(getDel()).toBe(mockDel)
    resetFileSystemDependencies()
  })

  it('setFastGlob allows dependency injection', () => {
    const mockFastGlob = (() => {}) as unknown as FastGlob
    setFastGlob(mockFastGlob)
    expect(getFastGlob()).toBe(mockFastGlob)
    resetFileSystemDependencies()
  })

  it('setPicomatch allows dependency injection', () => {
    const mockPicomatch = (() => {}) as unknown as Picomatch
    setPicomatch(mockPicomatch)
    expect(getPicomatch()).toBe(mockPicomatch)
    resetFileSystemDependencies()
  })

  it('resetFileSystemDependencies forces reload', () => {
    const mockDel: Del = {
      deleteAsync: async () => [],
      deleteSync: () => [],
    }
    setDel(mockDel)
    resetFileSystemDependencies()
    const reloaded = getDel()
    expect(reloaded).not.toBe(mockDel)
    expect(typeof reloaded.deleteAsync).toBe('function')
  })
})

describe('dependencies/logging', () => {
  it('getDebug loads and returns debug', () => {
    resetLoggingDependencies()
    const debug = getDebug()
    expect(debug).toBeDefined()
    expect(typeof debug).toBe('function')
    expect(typeof debug.enable).toBe('function')
  })

  it('getIsUnicodeSupported loads and returns is-unicode-supported', () => {
    resetLoggingDependencies()
    const isUnicodeSupported = getIsUnicodeSupported()
    expect(isUnicodeSupported).toBeDefined()
    expect(typeof isUnicodeSupported).toBe('function')
  })

  it('getLogger loads and returns logger', () => {
    resetLoggingDependencies()
    const logger = getLogger()
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('getSpinner loads and returns spinner', () => {
    resetLoggingDependencies()
    const spinner = getSpinner()
    expect(spinner).toBeDefined()
    expect(typeof spinner.start).toBe('function')
    expect(typeof spinner.stop).toBe('function')
  })

  it('getYoctoSpinner loads and returns yocto-spinner', () => {
    resetLoggingDependencies()
    const yoctoSpinner = getYoctoSpinner()
    expect(yoctoSpinner).toBeDefined()
    expect(typeof yoctoSpinner).toBe('function')
  })

  it('getYoctocolors loads and returns yoctocolors', () => {
    resetLoggingDependencies()
    const yoctocolors = getYoctocolors()
    expect(yoctocolors).toBeDefined()
    expect(typeof yoctocolors.red).toBe('function')
    expect(typeof yoctocolors.green).toBe('function')
  })

  it('setDebug allows dependency injection', () => {
    const mockDebug = (() => {}) as unknown as DebugJs
    mockDebug.enable = () => {}
    mockDebug.enabled = () => false
    setDebug(mockDebug)
    expect(getDebug()).toBe(mockDebug)
    resetLoggingDependencies()
  })

  it('setIsUnicodeSupported allows dependency injection', () => {
    setIsUnicodeSupported(mockIsUnicodeSupported)
    expect(getIsUnicodeSupported()).toBe(mockIsUnicodeSupported)
    resetLoggingDependencies()
  })

  it('setLogger allows dependency injection', () => {
    const mockLogger: Logger = {
      dir: () => {},
      error: () => {},
      info: () => {},
    }
    setLogger(mockLogger)
    expect(getLogger()).toBe(mockLogger)
    resetLoggingDependencies()
  })

  it('setSpinner allows dependency injection', () => {
    const mockSpinner: Spinner = {
      isSpinning: false,
      start: () => {},
      stop: () => {},
    }
    setSpinner(mockSpinner)
    expect(getSpinner()).toBe(mockSpinner)
    resetLoggingDependencies()
  })

  it('setYoctoSpinner allows dependency injection', () => {
    const mockYoctoSpinner = (() => {}) as unknown as YoctoSpinner
    setYoctoSpinner(mockYoctoSpinner)
    expect(getYoctoSpinner()).toBe(mockYoctoSpinner)
    resetLoggingDependencies()
  })

  it('setYoctocolors allows dependency injection', () => {
    const mockYoctocolors: Yoctocolors = {
      bold: t => t,
      cyan: t => t,
      dim: t => t,
      gray: t => t,
      green: t => t,
      magenta: t => t,
      red: t => t,
      yellow: t => t,
    }
    setYoctocolors(mockYoctocolors)
    expect(getYoctocolors()).toBe(mockYoctocolors)
    resetLoggingDependencies()
  })

  it('resetLoggingDependencies forces reload', () => {
    const mockLogger: Logger = {
      dir: () => {},
      error: () => {},
      info: () => {},
    }
    setLogger(mockLogger)
    resetLoggingDependencies()
    const reloaded = getLogger()
    expect(reloaded).not.toBe(mockLogger)
    expect(typeof reloaded.info).toBe('function')
  })
})

describe('dependencies/npm-tools', () => {
  it('getLibnpmpack loads and returns libnpmpack', () => {
    resetNpmToolsDependencies()
    const libnpmpack = getLibnpmpack()
    expect(libnpmpack).toBeDefined()
    expect(typeof libnpmpack).toBe('function')
  })

  it('getMakeFetchHappen loads and returns make-fetch-happen', () => {
    resetNpmToolsDependencies()
    const makeFetchHappen = getMakeFetchHappen()
    expect(makeFetchHappen).toBeDefined()
    expect(typeof makeFetchHappen).toBe('function')
  })

  it('getNormalizePackageData loads and returns normalize-package-data', () => {
    resetNpmToolsDependencies()
    const normalizePackageData = getNormalizePackageData()
    expect(normalizePackageData).toBeDefined()
    expect(typeof normalizePackageData).toBe('function')
  })

  it('getNpmPackageArg loads and returns npm-package-arg', () => {
    resetNpmToolsDependencies()
    const npmPackageArg = getNpmPackageArg()
    expect(npmPackageArg).toBeDefined()
    expect(typeof npmPackageArg).toBe('function')
  })

  it('getPackageJson loads and returns @npmcli/package-json', () => {
    resetNpmToolsDependencies()
    const packageJson = getPackageJson()
    expect(packageJson).toBeDefined()
    expect(typeof packageJson.load).toBe('function')
  })

  it('getPackageUrl loads and returns @socketregistry/packageurl-js', () => {
    resetNpmToolsDependencies()
    const packageUrl = getPackageUrl()
    expect(packageUrl).toBeDefined()
    expect(typeof packageUrl).toBe('object')
  })

  it('getPacote loads and returns pacote', () => {
    resetNpmToolsDependencies()
    const pacote = getPacote()
    expect(pacote).toBeDefined()
    expect(typeof pacote.extract).toBe('function')
    expect(typeof pacote.manifest).toBe('function')
  })

  it('getReadPackageJson loads and returns read-package-json', () => {
    resetNpmToolsDependencies()
    const readPackageJson = getReadPackageJson()
    expect(readPackageJson).toBeDefined()
    expect(typeof readPackageJson).toBe('function')
  })

  it('getSortPackageJson loads and returns sort-package-json', () => {
    resetNpmToolsDependencies()
    const sortPackageJson = getSortPackageJson()
    expect(sortPackageJson).toBeDefined()
    expect(typeof sortPackageJson).toBe('function')
  })

  it('setLibnpmpack allows dependency injection', () => {
    const mockLibnpmpack = (() => {}) as unknown as Libnpmpack
    setLibnpmpack(mockLibnpmpack)
    expect(getLibnpmpack()).toBe(mockLibnpmpack)
    resetNpmToolsDependencies()
  })

  it('setMakeFetchHappen allows dependency injection', () => {
    const mockMakeFetchHappen = (() => {}) as unknown as MakeFetchHappen
    setMakeFetchHappen(mockMakeFetchHappen)
    expect(getMakeFetchHappen()).toBe(mockMakeFetchHappen)
    resetNpmToolsDependencies()
  })

  it('setNormalizePackageData allows dependency injection', () => {
    const mockNormalizePackageData =
      (() => {}) as unknown as NormalizePackageData
    setNormalizePackageData(mockNormalizePackageData)
    expect(getNormalizePackageData()).toBe(mockNormalizePackageData)
    resetNpmToolsDependencies()
  })

  it('setNpmPackageArg allows dependency injection', () => {
    const mockNpmPackageArg = (() => {}) as unknown as NpmPackageArg
    setNpmPackageArg(mockNpmPackageArg)
    expect(getNpmPackageArg()).toBe(mockNpmPackageArg)
    resetNpmToolsDependencies()
  })

  it('setPackageJson allows dependency injection', () => {
    const mockPackageJson = {
      load: () => {},
    } as unknown as PackageJsonConstructor
    setPackageJson(mockPackageJson)
    expect(getPackageJson()).toBe(mockPackageJson)
    resetNpmToolsDependencies()
  })

  it('setPackageUrl allows dependency injection', () => {
    const mockPackageUrl: PackageUrl = {
      fromString: () => ({ name: '', type: '' }),
      toString: () => '',
    }
    setPackageUrl(mockPackageUrl)
    expect(getPackageUrl()).toBe(mockPackageUrl)
    resetNpmToolsDependencies()
  })

  it('setPacote allows dependency injection', () => {
    const mockPacote = {
      extract: async () => {},
      manifest: async () => ({}),
      packument: async () => ({}),
      tarball: { stream: async () => {} },
    } as unknown as Pacote
    setPacote(mockPacote)
    expect(getPacote()).toBe(mockPacote)
    resetNpmToolsDependencies()
  })

  it('setReadPackageJson allows dependency injection', () => {
    const mockReadPackageJson = (() => {}) as unknown as ReadPackageJson
    setReadPackageJson(mockReadPackageJson)
    expect(getReadPackageJson()).toBe(mockReadPackageJson)
    resetNpmToolsDependencies()
  })

  it('setSortPackageJson allows dependency injection', () => {
    const mockSortPackageJson = (() => {}) as unknown as SortPackageJson
    setSortPackageJson(mockSortPackageJson)
    expect(getSortPackageJson()).toBe(mockSortPackageJson)
    resetNpmToolsDependencies()
  })

  it('resetNpmToolsDependencies forces reload', () => {
    const mockPacote = {
      extract: async () => {},
      manifest: async () => ({}),
      packument: async () => ({}),
      tarball: { stream: async () => {} },
    } as unknown as Pacote
    setPacote(mockPacote)
    resetNpmToolsDependencies()
    const reloaded = getPacote()
    expect(reloaded).not.toBe(mockPacote)
    expect(typeof reloaded.manifest).toBe('function')
  })
})

describe('dependencies/prompts', () => {
  it('getInquirerConfirm loads and returns @inquirer/confirm', () => {
    resetPromptsDependencies()
    const inquirerConfirm = getInquirerConfirm()
    expect(inquirerConfirm).toBeDefined()
    expect(typeof inquirerConfirm.default).toBe('function')
  })

  it('getInquirerInput loads and returns @inquirer/input', () => {
    resetPromptsDependencies()
    const inquirerInput = getInquirerInput()
    expect(inquirerInput).toBeDefined()
    expect(typeof inquirerInput.default).toBe('function')
  })

  it('getInquirerPassword loads and returns @inquirer/password', () => {
    resetPromptsDependencies()
    const inquirerPassword = getInquirerPassword()
    expect(inquirerPassword).toBeDefined()
    expect(typeof inquirerPassword.default).toBe('function')
  })

  it('getInquirerSearch loads and returns @inquirer/search', () => {
    resetPromptsDependencies()
    const inquirerSearch = getInquirerSearch()
    expect(inquirerSearch).toBeDefined()
    expect(typeof inquirerSearch.default).toBe('function')
  })

  it('getInquirerSelect loads and returns @inquirer/select', () => {
    resetPromptsDependencies()
    const inquirerSelect = getInquirerSelect()
    expect(inquirerSelect).toBeDefined()
    expect(typeof inquirerSelect.default).toBe('function')
  })

  it('setInquirerConfirm allows dependency injection', () => {
    const mockInquirerConfirm: InquirerConfirm = { default: () => {} }
    setInquirerConfirm(mockInquirerConfirm)
    expect(getInquirerConfirm()).toBe(mockInquirerConfirm)
    resetPromptsDependencies()
  })

  it('setInquirerInput allows dependency injection', () => {
    const mockInquirerInput: InquirerInput = { default: () => {} }
    setInquirerInput(mockInquirerInput)
    expect(getInquirerInput()).toBe(mockInquirerInput)
    resetPromptsDependencies()
  })

  it('setInquirerPassword allows dependency injection', () => {
    const mockInquirerPassword: InquirerPassword = { default: () => {} }
    setInquirerPassword(mockInquirerPassword)
    expect(getInquirerPassword()).toBe(mockInquirerPassword)
    resetPromptsDependencies()
  })

  it('setInquirerSearch allows dependency injection', () => {
    const mockInquirerSearch: InquirerSearch = { default: () => {} }
    setInquirerSearch(mockInquirerSearch)
    expect(getInquirerSearch()).toBe(mockInquirerSearch)
    resetPromptsDependencies()
  })

  it('setInquirerSelect allows dependency injection', () => {
    const mockInquirerSelect: InquirerSelect = {
      Separator: {},
      default: () => {},
    }
    setInquirerSelect(mockInquirerSelect)
    expect(getInquirerSelect()).toBe(mockInquirerSelect)
    resetPromptsDependencies()
  })

  it('resetPromptsDependencies forces reload', () => {
    const mockInquirerConfirm: InquirerConfirm = { default: () => {} }
    setInquirerConfirm(mockInquirerConfirm)
    resetPromptsDependencies()
    const reloaded = getInquirerConfirm()
    expect(reloaded).not.toBe(mockInquirerConfirm)
    expect(typeof reloaded.default).toBe('function')
  })
})

describe('dependencies/system', () => {
  it('getPromiseSpawn loads and returns @npmcli/promise-spawn', () => {
    resetSystemDependencies()
    const promiseSpawn = getPromiseSpawn()
    expect(promiseSpawn).toBeDefined()
    expect(typeof promiseSpawn).toBe('function')
  })

  it('getStreamingIterables loads and returns streaming-iterables', () => {
    resetSystemDependencies()
    const streamingIterables = getStreamingIterables()
    expect(streamingIterables).toBeDefined()
    expect(typeof streamingIterables).toBe('object')
  })

  it('getWhich loads and returns which', () => {
    resetSystemDependencies()
    const which = getWhich()
    expect(which).toBeDefined()
    expect(typeof which).toBe('function')
  })

  it('setPromiseSpawn allows dependency injection', () => {
    const mockPromiseSpawn = { mock: true } as unknown as PromiseSpawn
    setPromiseSpawn(mockPromiseSpawn)
    expect(getPromiseSpawn()).toBe(mockPromiseSpawn)
    resetSystemDependencies()
  })

  it('setStreamingIterables allows dependency injection', () => {
    const mockStreamingIterables: StreamingIterables = {
      parallelMap: () => {},
      transform: () => {},
    }
    setStreamingIterables(mockStreamingIterables)
    expect(getStreamingIterables()).toBe(mockStreamingIterables)
    resetSystemDependencies()
  })

  it('setWhich allows dependency injection', () => {
    const mockWhich = (() => {}) as unknown as Which
    setWhich(mockWhich)
    expect(getWhich()).toBe(mockWhich)
    resetSystemDependencies()
  })

  it('resetSystemDependencies forces reload', () => {
    const mockWhich = (() => {}) as unknown as Which
    setWhich(mockWhich)
    resetSystemDependencies()
    const reloaded = getWhich()
    expect(reloaded).not.toBe(mockWhich)
    expect(typeof reloaded).toBe('function')
  })
})

describe('dependencies/validation', () => {
  it('getSpdxCorrect loads and returns spdx-correct', () => {
    resetValidationDependencies()
    const spdxCorrect = getSpdxCorrect()
    expect(spdxCorrect).toBeDefined()
    expect(typeof spdxCorrect).toBe('function')
  })

  it('getSpdxExpressionParse loads and returns spdx-expression-parse', () => {
    resetValidationDependencies()
    const spdxExpressionParse = getSpdxExpressionParse()
    expect(spdxExpressionParse).toBeDefined()
    expect(typeof spdxExpressionParse).toBe('function')
  })

  it('getValidateNpmPackageName loads and returns validate-npm-package-name', () => {
    resetValidationDependencies()
    const validateNpmPackageName = getValidateNpmPackageName()
    expect(validateNpmPackageName).toBeDefined()
    expect(typeof validateNpmPackageName).toBe('function')
  })

  it('setSpdxCorrect allows dependency injection', () => {
    setSpdxCorrect(mockSpdxCorrect)
    expect(getSpdxCorrect()).toBe(mockSpdxCorrect)
    resetValidationDependencies()
  })

  it('setSpdxExpressionParse allows dependency injection', () => {
    setSpdxExpressionParse(mockSpdxExpressionParse)
    expect(getSpdxExpressionParse()).toBe(mockSpdxExpressionParse)
    resetValidationDependencies()
  })

  it('setValidateNpmPackageName allows dependency injection', () => {
    setValidateNpmPackageName(mockValidateNpmPackageName)
    expect(getValidateNpmPackageName()).toBe(mockValidateNpmPackageName)
    resetValidationDependencies()
  })

  it('resetValidationDependencies forces reload', () => {
    setSpdxCorrect(mockSpdxCorrect)
    resetValidationDependencies()
    const reloaded = getSpdxCorrect()
    expect(reloaded).not.toBe(mockSpdxCorrect)
    expect(typeof reloaded).toBe('function')
  })
})

describe('dependencies/index', () => {
  it('resetDependencies calls all reset functions', () => {
    const uniqueMockSemver = { valid: () => 'unique-mock-value' } as unknown as Semver
    const uniqueMockLogger: Logger = {
      dir: () => {},
      error: () => {},
      info: () => {},
    }

    setSemver(uniqueMockSemver)
    setLogger(uniqueMockLogger)

    expect(getSemver()).toBe(uniqueMockSemver)
    expect(getLogger()).toBe(uniqueMockLogger)

    resetDependencies()

    const afterResetSemver = getSemver()
    const afterResetLogger = getLogger()

    expect(afterResetSemver).toBeDefined()
    expect(afterResetLogger).toBeDefined()
    expect(typeof afterResetSemver.valid).toBe('function')
    expect(typeof afterResetLogger.info).toBe('function')
  })
})
