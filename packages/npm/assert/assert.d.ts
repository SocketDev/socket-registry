/// <reference types="node" />
import nodeAssert from 'node:assert'

declare interface CommonJsAssert
  extends Pick<
    typeof nodeAssert,
    | 'AssertionError'
    | 'deepEqual'
    | 'deepStrictEqual'
    | 'doesNotMatch'
    | 'doesNotReject'
    | 'doesNotThrow'
    | 'equal'
    | 'fail'
    | 'ifError'
    | 'match'
    | 'notDeepEqual'
    | 'notDeepStrictEqual'
    | 'notEqual'
    | 'notStrictEqual'
    | 'ok'
    | 'rejects'
    | 'strict'
    | 'strictEqual'
    | 'throws'
  > {}
declare const commonJsAssert: CommonJsAssert
export = commonJsAssert
