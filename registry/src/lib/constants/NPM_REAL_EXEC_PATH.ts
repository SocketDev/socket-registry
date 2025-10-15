/**
 * @fileoverview Environment variable name for the real NPM executable path.
 */

import { resolveBinPathSync } from '../bin'
import npmExecPath from './npm-exec-path'

export default resolveBinPathSync(npmExecPath)
