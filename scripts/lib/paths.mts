import { fileURLToPath } from 'node:url'

export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url))
