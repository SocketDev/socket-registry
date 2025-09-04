'use strict'

const { getTime: DateProtoGetTime } = Date.prototype
const { get: MapProtoGet, has: MapProtoHas } = Map.prototype
const MapProtoSizeGetter = Map.prototype.__lookupGetter__('size')
const { toString: objToStr } = Object.prototype
const { apply: ReflectApply } = Reflect
const {
  add: SetProtoAdd,
  delete: SetProtoDelete,
  has: SetProtoHas
} = Set.prototype
const SetProtoSizeGetter = Set.prototype.__lookupGetter__('size')
const SharedArrayBufferByteLengthGetter =
  SharedArrayBuffer.prototype.__lookupGetter__('byteLength')

function dateProtoGetTime(date) {
  return ReflectApply(DateProtoGetTime, date, [])
}

function mapProtoGet(map, key) {
  return ReflectApply(MapProtoGet, map, [key])
}

function mapProtoHas(map, key) {
  return ReflectApply(MapProtoHas, map, [key])
}

function mapProtoSize(map) {
  return ReflectApply(MapProtoSizeGetter, map, [])
}

function objectProtoToString(object) {
  return ReflectApply(objToStr, object, [])
}

function sharedArrayBufferProtoByteLength(sab) {
  return ReflectApply(SharedArrayBufferByteLengthGetter, sab, [])
}

function setProtoAdd(set, value) {
  return ReflectApply(SetProtoAdd, set, [value])
}

function setProtoDelete(set, key) {
  return ReflectApply(SetProtoDelete, set, [key])
}

function setProtoHas(set, key) {
  return ReflectApply(SetProtoHas, set, [key])
}

function setProtoSize(set) {
  return ReflectApply(SetProtoSizeGetter, set, [])
}

module.exports = function callBoundIntrinsic(name, _allowMissing) {
  switch (name) {
    case 'Date.prototype.getTime':
      return dateProtoGetTime
    case 'Map.prototype.get':
      return mapProtoGet
    case 'Map.prototype.has':
      return mapProtoHas
    case 'Map.prototype.size':
      return mapProtoSize
    case 'Object.prototype.toString':
      return objectProtoToString
    case 'Set.prototype.add':
      return setProtoAdd
    case 'Set.prototype.delete':
      return setProtoDelete
    case 'Set.prototype.has':
      return setProtoHas
    case 'Set.prototype.size':
      return setProtoSize
    case 'SharedArrayBuffer.prototype.byteLength':
      return sharedArrayBufferProtoByteLength
  }
  return undefined
}
