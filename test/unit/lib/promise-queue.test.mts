import { describe, expect, it } from 'vitest'

import { PromiseQueue } from '../../../registry/src/lib/promise-queue'

describe('PromiseQueue', () => {
  it('executes tasks with concurrency limit', async () => {
    const queue = new PromiseQueue(2)
    let running = 0
    let maxRunning = 0

    const task = async () => {
      running += 1
      maxRunning = Math.max(maxRunning, running)
      await new Promise(resolve => setTimeout(resolve, 10))
      running -= 1
      return 'done'
    }

    const results = await Promise.all([
      queue.add(task),
      queue.add(task),
      queue.add(task),
      queue.add(task),
    ])

    expect(results).toEqual(['done', 'done', 'done', 'done'])
    expect(maxRunning).toBeLessThanOrEqual(2)
  })

  it('handles errors in tasks', async () => {
    const queue = new PromiseQueue(1)
    await expect(
      queue.add(async () => {
        throw new Error('task failed')
      }),
    ).rejects.toThrow('task failed')
  })

  it('drops oldest task when maxQueueLength exceeded', async () => {
    const queue = new PromiseQueue(1, 2)
    const results: string[] = []

    const slowTask = async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 20))
      results.push(id)
      return id
    }

    const promises = [
      queue.add(() => slowTask('1')),
      queue.add(() => slowTask('2')),
      queue.add(() => slowTask('3')),
      queue.add(() => slowTask('4')),
    ]

    await Promise.allSettled(promises)
    expect(results.length).toBeGreaterThan(0)
  })

  it('throws error for invalid maxConcurrency', () => {
    expect(() => new PromiseQueue(0)).toThrow('maxConcurrency must be at least 1')
    expect(() => new PromiseQueue(-1)).toThrow(
      'maxConcurrency must be at least 1',
    )
  })

  it('handles empty queue', async () => {
    const queue = new PromiseQueue(2)
    const result = await queue.add(async () => 'result')
    expect(result).toBe('result')
  })
})
