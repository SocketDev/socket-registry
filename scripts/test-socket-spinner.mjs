/**
 * @fileoverview Test Socket spinner with various shimmer configurations.
 * Demonstrates different shimmer colors, directions, and speeds.
 */

import { setTimeout as sleep } from 'node:timers/promises'

import { RAINBOW_GRADIENT } from '../registry/dist/lib/effects/ultra.js'
import { Spinner } from '../registry/dist/lib/spinner.js'

async function testSpinner() {
  console.log('Testing Socket Spinner with shimmer\n')

  // Test 1: Default shimmer (purple, LTR)
  console.log('1. Default shimmer (purple, LTR):')
  let spinner = Spinner({ shimmer: { dir: 'ltr' } })
  spinner.start('Loading')
  await sleep(2000)
  spinner.successAndStop('Done')
  await sleep(500)

  // Test 2: Bidirectional shimmer
  console.log('\n2. Bidirectional shimmer:')
  spinner = Spinner({ shimmer: { dir: 'bi' } })
  spinner.start('Processing')
  await sleep(3000)
  spinner.successAndStop('Complete')
  await sleep(500)

  // Test 3: Rainbow gradient
  console.log('\n3. Rainbow gradient (ultrathink):')
  spinner = Spinner({
    shimmer: {
      color: RAINBOW_GRADIENT,
      dir: 'ltr',
    },
  })
  spinner.start('Ultrathink mode')
  await sleep(3000)
  spinner.successAndStop('Ultrathink complete')
  await sleep(500)

  // Test 4: Custom speed (slow)
  console.log('\n4. Slow shimmer:')
  spinner = Spinner({
    shimmer: {
      dir: 'ltr',
      speed: 0.2,
    },
  })
  spinner.start('Slow shimmer')
  await sleep(2000)
  spinner.successAndStop('Done')
  await sleep(500)

  // Test 5: Custom speed (fast)
  console.log('\n5. Fast shimmer:')
  spinner = Spinner({
    shimmer: {
      dir: 'ltr',
      speed: 1.0,
    },
  })
  spinner.start('Fast shimmer')
  await sleep(2000)
  spinner.successAndStop('Done')
  await sleep(500)

  // Test 6: Custom color gradient
  console.log('\n6. Custom gradient (fire):')
  const fireGradient = [
    // Red.
    [255, 0, 0],
    // Orange.
    [255, 140, 0],
    // Yellow.
    [255, 200, 0],
    // Orange.
    [255, 140, 0],
  ]
  spinner = Spinner({
    shimmer: {
      color: fireGradient,
      dir: 'bi',
    },
  })
  spinner.start('Fire effect')
  await sleep(3000)
  spinner.successAndStop('Done')

  console.log('\nAll tests complete!')
}

testSpinner().catch(console.error)
