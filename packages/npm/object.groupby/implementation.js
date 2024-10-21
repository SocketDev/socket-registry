'use strict'

const { groupBy: ObjectGroupBy } = Object

// Based on the following specification text:
// https://tc39.es/ecma262/#sec-object.groupby
module.exports =
  typeof ObjectGroupBy === 'function'
    ? ObjectGroupBy
    : (() => {
        const { MAX_SAFE_INTEGER } = Number
        const StringCtor = String
        const { iterator: SymbolIterator } = Symbol
        const TypeErrorCtor = TypeError

        // Based on the following specification text:
        // https://tc39.es/ecma262/#sec-add-value-to-keyed-group
        function AddValueToKeyedGroup(groups, key, value) {
          let matched = 0
          // Step 1: For each Record { [[Key]], [[Elements]] } g of groups, do
          for (let i = 0, { length } = groups; i < length; i += 1) {
            const g = groups[i]
            // Step 1a: If SameValue(g.[[Key]], key) is true, then
            if (g.key === key) {
              // Step 1a.i: Assert: Exactly one element of groups meets this criterion.
              matched += 1
              if (matched > 1) {
                throw new TypeErrorCtor(
                  'Assertion failed: Exactly one element of groups meets this criterion'
                )
              }
              // Step 1a.ii: Append value to g.[[Elements]].
              g.elements.push(value)
            }
          }
          // Step 2: Let group be the Record { [[Key]]: key, [[Elements]]: << value >> }.
          const group = { key: key, elements: [value] }
          // Step 3: Append group to groups.
          groups.push(group)
          // Step 4: Return unused.
        }

        // Based on the following specification text:
        // https://tc39.es/ecma262/#sec-groupby
        function GroupBy(items, callbackfn) {
          // Step 1: Perform RequireObjectCoercible(items).
          if (items === null || items === undefined) {
            throw new TypeError('Cannot convert null or undefined to object')
          }
          // Step 2: If IsCallable(callback) is false, throw a TypeError exception.
          if (typeof callbackfn !== 'function') {
            throw new TypeError('callbackfn must be callable')
          }
          // Step 3: Let groups be a new empty List.
          const groups = []
          // Step 4: Let iteratorRecord be GetIterator(items, sync).
          const iterator = items[SymbolIterator]()
          // Step 5: Let k be 0.
          let k = 0
          // Step 6: Repeat.
          while (true) {
            // Step 6a: If k ≥ 2**53 - 1, then
            if (k >= MAX_SAFE_INTEGER) {
              // Step 6a.i: Let error be ThrowCompletion(a newly created TypeError object).
              throw new TypeError('k must be less than 2 ** 53 - 1')
            }
            // Step 6b: Let next be IteratorStepValue(iteratorRecord).
            const next = iterator.next()
            // Step 6c: If next is done, then.
            if (next.done) {
              // Step 6c.i: Return groups.
              return groups
            }
            // Step 6d: Let value be next.
            const value = next.value
            // Step 6e: Let key be Completion(Call(callback, undefined, << value, F(k) >>)).
            let key = callbackfn(value, k)
            // Step 6g: If keyCoercion is property, then
            // Step 6g.i: Set key to Completion(ToPropertyKey(key)).
            key = typeof key === 'symbol' ? key : StringCtor(key)
            // Step 6i: Perform AddValueToKeyedGroup(groups, key, value).
            AddValueToKeyedGroup(groups, key, value)
            // Step 6j: Set k to k + 1.
            k += 1
          }
        }

        // Based on the following specification text:
        // https://tc39.es/ecma262/#sec-object.groupby
        return function groupBy(items, callbackfn) {
          // Step 1: Let groups be GroupBy(items, callback, property).
          const groups = GroupBy(items, callbackfn)
          // Step 2: Let obj be OrdinaryObjectCreate(null).
          const obj = { __proto__: null }
          // Step 3: 3. For each Record { [[Key]], [[Elements]] } g of groups, do
          for (let i = 0, { length } = groups; i < length; i += 1) {
            // Step 3a: Let elements be CreateArrayFromList(g.[[Elements]]).
            // Step 3b: Perform CreateDataPropertyOrThrow(obj, g.[[Key]], elements).
            const g = groups[i]
            obj[g.key] = g.elements
          }
          // Step 4: Return obj.
          return obj
        }
      })()
