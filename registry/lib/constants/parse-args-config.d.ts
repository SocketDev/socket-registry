declare type parseArgsConfig = {
  options: {
    force: {
      type: 'boolean'
      short: 'f'
    }
    quiet: {
      type: 'boolean'
    }
  }
  strict: false
}
declare const parseArgsConfig: parseArgsConfig
export = parseArgsConfig
