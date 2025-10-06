/**
 * @fileoverview Environment variable name for the real NPM executable path.
 */

import npmExecPath from './npm-exec-path'
import { resolveBinPathSync } from '../bin'

export default resolveBinPathSync(npmExecPath)
