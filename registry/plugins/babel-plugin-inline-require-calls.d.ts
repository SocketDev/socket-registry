/** @fileoverview Type declarations for babel-plugin-inline-require-calls. */

import type { PluginObj, PluginPass } from '@babel/core'

export default function inlineRequireCalls(babel: {
  types: typeof import('@babel/types')
}): PluginObj<PluginPass>
