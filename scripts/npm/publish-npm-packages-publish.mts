/**
 * @file The npm publish actions for the publish workflow: OIDC trusted
 *   publishing with exponential-backoff retry, plus the concurrency-bounded
 *   fan-out over a package list. Split out of publish-npm-packages.mts so that
 *   orchestrator stays under the file-size soft cap.
 */

import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { isPlainObject as isObjectObject } from '@socketsecurity/lib-stable/objects/predicates'
import { pEach } from '@socketsecurity/lib-stable/promises/iterate'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

import { WIN32 } from '../constants/node.mts'
import { extractNpmError } from '../repo/util/errors.mts'

const logger = getDefaultLogger()

/**
 * Publish package using npm with OIDC trusted publishing.
 *
 * @throws {TypeError} When state parameter is not an object.
 */
export async function publish(pkg, state, options) {
  await publishTrusted(pkg, state, options)
}

/**
 * Publish multiple packages with concurrency control.
 *
 * @throws {TypeError} When state parameter is not an object.
 */
export async function publishPackages(packages, state, options) {
  const okayPackages = packages.filter(
    pkg => !state.fails.includes(pkg.printName),
  )
  // Chunk non-failed package names to process them in parallel 3 at a time.
  await pEach(
    okayPackages,
    async pkg => {
      await publish(pkg, state, options)
    },
    { concurrency: 3 },
  )
}

/**
 * Publish package using npm with OIDC trusted publishing.
 *
 * @throws {TypeError} When state parameter is not an object.
 */
export async function publishTrusted(pkg, state, options) {
  const { maxRetries = 3, retryDelay = 1000 } = { __proto__: null, ...options }
  if (!isObjectObject(state)) {
    throw new TypeError('A state object is required')
  }

  // Retry flow:
  // 1. Attempt publish with npm using OIDC trusted publishing.
  // 2. On success, exit immediately.
  // 3. On error, check if package already exists (cannot publish over) - if so, exit.
  // 4. On other errors, retry with exponential backoff: 1s, 2s, 4s delays.
  // 5. After maxRetries exhausted, add to fails list and log final error.
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      if (attempt > 0) {
        const delay = retryDelay * 2 ** (attempt - 1)
        logger.log(
          `${pkg.printName}: Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
        )

        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // Use npm for trusted publishing with OIDC tokens. `--provenance`
      // requires the GitHub Actions OIDC id-token endpoint, so it's
      // gated on GITHUB_ACTIONS=true — local emergency publishes (run
      // with a classic npm token) still work without provenance.
      const publishArgs = ['publish', '--access', 'public']
      if (process.env['GITHUB_ACTIONS'] === 'true') {
        publishArgs.splice(1, 0, '--provenance')
      }
      const result = await spawn('npm', publishArgs, {
        cwd: pkg.path,
        env: {
          ...process.env,
          // Don't set NODE_AUTH_TOKEN for trusted publishing - uses OIDC.
        },
        shell: WIN32,
      })
      if (result.stdout) {
        logger.log(result.stdout)
      }
      // Success - exit retry loop.
      return
    } catch (e) {
      lastError = e
      const stderr = e?.stderr ?? ''
      // Don't retry if package already exists.
      if (stderr.includes('cannot publish over')) {
        return
      }
      // Log the error but continue retrying.
      if (stderr && attempt < maxRetries - 1) {
        logger.warn(`${pkg.printName}: Publish attempt ${attempt + 1} failed`)
      }
    }
  }

  // All retries exhausted.
  state.fails.push(pkg.printName)
  const stderr = lastError?.stderr ?? ''
  if (stderr) {
    logger.log('')
    logger.log(extractNpmError(stderr))
    logger.log('')
  }
}
