'use strict'

const { groupBy: ObjectGroupBy } = Object

// Based specification text:
// https://tc39.es/ecma262/#sec-object.groupby
module.exports =
  typeof ObjectGroupBy === 'function'
    ? ObjectGroupBy
    : (() => {
        const { MAX_SAFE_INTEGER } = Number
        const { apply: ReflectApply } = Reflect
        const StringCtor = String
        const { iterator: SymbolIterator } = Symbol
        const TypeErrorCtor = TypeError

        // Based specification text:
        // https://tc39.es/ecma262/#sec-add-value-to-keyed-group
        function AddValueToKeyedGroup(groups, key, value) {
          let matched = 0
          // Step 1: For each Record { [[Key]], [[Elements]] } g of groups, do
          for (let i = 0, { length } = groups; i < length; i += 1) {
            const g = groups[i]
            // Step 1.a: If SameValue(g.[[Key]], key) is true, then
            if (g.key === key) {
              // Step 1.a.i: Assert: Exactly one element of groups meets this criterion.
              matched += 1
              if (matched > 1) {
                throw new TypeErrorCtor(
                  'Assertion failed: Exactly one element of groups meets this criterion'
                )
              }
              // Step 1.a.ii: Append value to g.[[Elements]].
              g.elements.push(value)
            }
          }
          if (matched === 0) {
            // Step 2: Let group be the Record { [[Key]]: key, [[Elements]]: << value >> }.
            const group = { key: key, elements: [value] }
            // Step 3: Append group to groups.
            groups[groups.length] = group
          }
          // Step 4: Return unused.
        }

        // Based specification text:
        // https://tc39.es/ecma262/#sec-groupby
        function GroupBy(items, callbackfn) {
          // Step 1: Perform RequireObjectCoercible(items).
          if (items === null || items === undefined) {
            throw new TypeErrorCtor(
              'Cannot convert null or undefined to object'
            )
          }
          // Step 2: If IsCallable(callback) is false, throw a TypeError exception.
          if (typeof callbackfn !== 'function') {
            throw new TypeErrorCtor('callbackfn must be callable')
          }
          // Step 3: Let groups be a new empty List.
          const groups = []
          // Step 4: Let iteratorRecord be GetIterator(items, sync).
          const method = items[SymbolIterator]
          if (typeof method !== 'function') {
            throw new TypeErrorCtor('Method is not a function')
          }
          const iterator = ReflectApply(method, items, [])
          if (
            typeof iterator !== 'function' &&
            (iterator === null || typeof iterator !== 'object')
          ) {
            throw new TypeErrorCtor('`iterator` value must be an Object')
          }
          // Step 5: Let k be 0.
          let k = 0
          // Step 6: Repeat.
          while (true) {
            // Step 6.a: If k ≥ 2**53 - 1, then
            if (k >= MAX_SAFE_INTEGER) {
              // Step 6.a.i: Let error be ThrowCompletion(a newly created TypeError object).
              throw new TypeErrorCtor('k must be less than 2 ** 53 - 1')
            }
            // Step 6.b: Let next be IteratorStepValue(iteratorRecord).
            const next = iterator.next()
            // Step 6.c: If next is done, then.
            if (next.done) {
              // Step 6.c.i: Return groups.
              return groups
            }
            // Step 6.d: Let value be next.
            const value = next.value
            // Step 6.e: Let key be Completion(Call(callback, undefined, << value, F(k) >>)).
            let key = callbackfn(value, k)
            // Step 6.g: If keyCoercion is property, then
            // Step 6.g.i: Set key to Completion(ToPropertyKey(key)).
            key = typeof key === 'symbol' ? key : StringCtor(key)
            // Step 6.i: Perform AddValueToKeyedGroup(groups, key, value).
            AddValueToKeyedGroup(groups, key, value)
            // Step 6.j: Set k to k + 1.
            k += 1
          }
        }

        // Based specification text:
        // https://tc39.es/ecma262/#sec-object.groupby
        return function groupBy(items, callbackfn) {
          // Step 1: Let groups be GroupBy(items, callback, property).
          const groups = GroupBy(items, callbackfn)
          // Step 2: Let obj be OrdinaryObjectCreate(null).
          const obj = { __proto__: null }
          // Step 3: For each Record { [[Key]], [[Elements]] } g of groups, do
          for (let i = 0, { length } = groups; i < length; i += 1) {
            // Step 3.a: Let elements be CreateArrayFromList(g.[[Elements]]).
            // Step 3.b: Perform CreateDataPropertyOrThrow(obj, g.[[Key]], elements).
            const g = groups[i]
            obj[g.key] = g.elements
          }
          // Step 4: Return obj.
          return obj
        }
      })()
