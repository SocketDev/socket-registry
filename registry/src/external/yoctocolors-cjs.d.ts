interface YoctoColors {
  // Modifiers
  reset: (text: string) => string
  bold: (text: string) => string
  dim: (text: string) => string
  italic: (text: string) => string
  underline: (text: string) => string
  overline: (text: string) => string
  inverse: (text: string) => string
  hidden: (text: string) => string
  strikethrough: (text: string) => string

  // Colors
  black: (text: string) => string
  red: (text: string) => string
  green: (text: string) => string
  yellow: (text: string) => string
  blue: (text: string) => string
  magenta: (text: string) => string
  cyan: (text: string) => string
  white: (text: string) => string
  gray: (text: string) => string
  grey: (text: string) => string

  // Background colors
  bgBlack: (text: string) => string
  bgRed: (text: string) => string
  bgGreen: (text: string) => string
  bgYellow: (text: string) => string
  bgBlue: (text: string) => string
  bgMagenta: (text: string) => string
  bgCyan: (text: string) => string
  bgWhite: (text: string) => string
}

declare const yoctocolorsCjs: YoctoColors

export = yoctocolorsCjs
