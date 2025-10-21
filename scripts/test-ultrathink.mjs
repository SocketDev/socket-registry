/**
 * @fileoverview Test ultrathink rainbow gradient with shimmer.
 * Demonstrates the rainbow gradient effect combined with shimmer animation.
 */

import { setTimeout as sleep } from 'node:timers/promises'

import { RAINBOW_GRADIENT } from '@socketsecurity/lib/effects/ultra'
import { Spinner } from '@socketsecurity/lib/spinner'

async function testUltrathink() {
  console.log('Testing ultrathink rainbow gradient with shimmer\n')

  const spinner = Spinner({
    shimmer: {
      color: RAINBOW_GRADIENT,
      dir: 'ltr',
    },
  })

  spinner.start('Ultrathink complete')

  // Let it shimmer for 5 seconds
  await sleep(5000)

  spinner.successAndStop('Ultrathink complete')

  console.log(
    '\nRainbow gradient with shimmer animation demonstrated successfully!',
  )
}

testUltrathink().catch(console.error)
