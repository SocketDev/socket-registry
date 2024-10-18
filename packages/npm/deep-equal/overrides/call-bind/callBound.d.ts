declare function callBoundIntrinsic(
  name: 'Date.prototype.getTime',
  allowMissing?: boolean
): (date: Date) => ReturnType<typeof Date.prototype.getTime>
declare function callBoundIntrinsic(
  name: 'Map.prototype.get',
  allowMissing?: boolean
): (map: Map<any, any>, key: any) => ReturnType<typeof Map.prototype.get>
declare function callBoundIntrinsic(
  name: 'Map.prototype.has',
  allowMissing?: boolean
): (map: Map<any, any>, key: any) => ReturnType<typeof Map.prototype.has>
declare function callBoundIntrinsic(
  name: 'Map.prototype.size',
  allowMissing?: boolean
): (map: Map<any, any>) => typeof Map.prototype.size
declare function callBoundIntrinsic(
  name: 'Object.prototype.toString',
  allowMissing?: boolean
): (obj: any) => ReturnType<typeof Object.prototype.toString>
declare function callBoundIntrinsic(
  name: 'Set.prototype.add',
  allowMissing?: boolean
): (set: Set<any>, value: any) => ReturnType<typeof Set.prototype.add>
declare function callBoundIntrinsic(
  name: 'Set.prototype.delete',
  allowMissing?: boolean
): (set: Set<any>, value: any) => ReturnType<typeof Set.prototype.delete>
declare function callBoundIntrinsic(
  name: 'Set.prototype.has',
  allowMissing?: boolean
): (set: Set<any>, value: any) => ReturnType<typeof Set.prototype.has>
declare function callBoundIntrinsic(
  name: 'Set.prototype.size',
  allowMissing?: boolean
): (set: Set<any>) => typeof Set.prototype.size
declare function callBoundIntrinsic(
  name: 'SharedArrayBuffer.prototype.byteLength',
  allowMissing?: boolean
): (sab: SharedArrayBuffer) => typeof SharedArrayBuffer.prototype.byteLength
declare function callBoundIntrinsic(
  name: string,
  allowMissing?: boolean
): undefined
export = callBoundIntrinsic
