declare function callBoundIntrinsic(
  name: 'RegExp.prototype.test',
  allowMissing?: boolean
): (regex: RegExp, str: string) => ReturnType<typeof RegExp.prototype.test>
declare function callBoundIntrinsic(
  name: string,
  allowMissing?: boolean
): undefined
export = callBoundIntrinsic
