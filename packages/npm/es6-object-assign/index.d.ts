declare interface ES6ObjectAssign {
  assign: typeof Object.assign
  polyfill: () => void
}
declare const es6ObjectAssign: ES6ObjectAssign
export = es6ObjectAssign
