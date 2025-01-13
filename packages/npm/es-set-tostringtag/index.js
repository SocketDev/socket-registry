'use strict'

const { defineProperty: ObjectDefineProperty, hasOwn: ObjectHasOwn } = Object
const TypeErrorCtor = TypeError

module.exports = function setToStringTag(object, value, options) {
  const { force, nonConfigurable } = { __proto__: null, ...options }
	if (
    (force !== undefined && typeof force !== 'boolean') ||
		(nonConfigurable !== undefined && typeof nonConfigurable !== 'boolean')
	) {
		throw new TypeErrorCtor('if provided, the `force` and `nonConfigurable` options must be booleans')
	}
  if (
    force ||
    !ObjectHasOwn(object, Symbol.toStringTag)
  ) {
    ObjectDefineProperty(object, Symbol.toStringTag, {
      __proto__: null,
      configurable: !nonConfigurable,
      enumerable: false,
      value,
      writable: false
    })
  }
}
