declare function callBoundIntrinsic(
  name: 'RegExp.prototype.test',
  allowMissing?: boolean
): (regex: RegExp, str: string) => boolean
export = callBoundIntrinsic
