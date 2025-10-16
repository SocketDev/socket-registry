/**
 * @fileoverview Tests for promise queue.
 *
 * Validates PromiseQueue class for managing concurrent async task execution.
 */
import { describe, expect, it } from 'vitest'

import { PromiseQueue } from '../../../registry/dist/lib/promise-queue.js'

describe('PromiseQueue', () => {
  describe('constructor', () => {
    it('should create queue with valid maxConcurrency', () => {
      const queue = new PromiseQueue(1)
      expect(queue.activeCount).toBe(0)
      expect(queue.pendingCount).toBe(0)
    })

    it('should create queue with maxConcurrency and maxQueueLength', () => {
      const queue = new PromiseQueue(2, 10)
      expect(queue.activeCount).toBe(0)
      expect(queue.pendingCount).toBe(0)
    })

    it('should throw error when maxConcurrency is 0', () => {
      expect(() => new PromiseQueue(0)).toThrow(
        'maxConcurrency must be at least 1',
      )
    })

    it('should throw error when maxConcurrency is negative', () => {
      expect(() => new PromiseQueue(-1)).toThrow(
        'maxConcurrency must be at least 1',
      )
      expect(() => new PromiseQueue(-5)).toThrow(
        'maxConcurrency must be at least 1',
      )
    })

    it('should accept large maxConcurrency values', () => {
      const queue = new PromiseQueue(1000)
      expect(queue.activeCount).toBe(0)
    })

    it('should accept maxQueueLength of 0', () => {
      const queue = new PromiseQueue(1, 0)
      expect(queue.pendingCount).toBe(0)
    })
  })

  describe('add', () => {
    it('should execute single task', async () => {
      const queue = new PromiseQueue(1)
      const result = await queue.add(async () => 'success')
      expect(result).toBe('success')
    })

    it('should execute task that returns number', async () => {
      const queue = new PromiseQueue(1)
      const result = await queue.add(async () => 42)
      expect(result).toBe(42)
    })

    it('should execute task that returns object', async () => {
      const queue = new PromiseQueue(1)
      const obj = { foo: 'bar', count: 123 }
      const result = await queue.add(async () => obj)
      expect(result).toEqual(obj)
    })

    it('should execute task that returns undefined', async () => {
      const queue = new PromiseQueue(1)
      const result = await queue.add(async () => undefined)
      expect(result).toBeUndefined()
    })

    it('should execute task that returns null', async () => {
      const queue = new PromiseQueue(1)
      const result = await queue.add(async () => null)
      expect(result).toBeNull()
    })

    it('should execute multiple tasks sequentially with concurrency 1', async () => {
      const queue = new PromiseQueue(1)
      const order: number[] = []
      let running = 0

      const task = async (id: number) => {
        running++
        expect(running).toBe(1)
        order.push(id)
        await new Promise(resolve => setTimeout(resolve, 10))
        running--
        return id
      }

      const results = await Promise.all([
        queue.add(() => task(1)),
        queue.add(() => task(2)),
        queue.add(() => task(3)),
      ])

      expect(results).toEqual([1, 2, 3])
      expect(order).toEqual([1, 2, 3])
    })

    it('should execute tasks with concurrency limit of 2', async () => {
      const queue = new PromiseQueue(2)
      let running = 0
      let maxRunning = 0

      const task = async () => {
        running++
        maxRunning = Math.max(maxRunning, running)
        await new Promise(resolve => setTimeout(resolve, 10))
        running--
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
      expect(maxRunning).toBeGreaterThan(1)
    })

    it('should execute tasks with high concurrency limit', async () => {
      const queue = new PromiseQueue(10)
      const tasks = Array.from({ length: 5 }, (_, i) =>
        queue.add(async () => i),
      )
      const results = await Promise.all(tasks)
      expect(results).toEqual([0, 1, 2, 3, 4])
    })

    it('should handle task that throws error', async () => {
      const queue = new PromiseQueue(1)
      await expect(
        queue.add(async () => {
          throw new Error('task failed')
        }),
      ).rejects.toThrow('task failed')
    })

    it('should handle task that throws custom error', async () => {
      const queue = new PromiseQueue(1)
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }
      await expect(
        queue.add(async () => {
          throw new CustomError('custom error')
        }),
      ).rejects.toThrow('custom error')
    })

    it('should handle task that rejects with non-Error value', async () => {
      const queue = new PromiseQueue(1)
      await expect(
        queue.add(async () => {
          throw 'string error'
        }),
      ).rejects.toBe('string error')
    })

    it('should continue processing other tasks after error', async () => {
      const queue = new PromiseQueue(1)
      const results = await Promise.allSettled([
        queue.add(async () => {
          throw new Error('error')
        }),
        queue.add(async () => 'success'),
      ])

      expect(results[0].status).toBe('rejected')
      expect(results[1].status).toBe('fulfilled')
      if (results[1].status === 'fulfilled') {
        expect(results[1].value).toBe('success')
      }
    })

    it('should drop oldest task when maxQueueLength exceeded', async () => {
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

      const settled = await Promise.allSettled(promises)
      const rejected = settled.filter(r => r.status === 'rejected')

      expect(rejected.length).toBeGreaterThan(0)
      expect(rejected[0]?.status).toBe('rejected')
      if (rejected[0]?.status === 'rejected') {
        expect(rejected[0]?.reason.message).toBe(
          'Task dropped: queue length exceeded',
        )
      }
    })

    it('should drop multiple tasks when maxQueueLength is small', async () => {
      const queue = new PromiseQueue(1, 1)

      const slowTask = async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 20))
        return id
      }

      const promises = [
        queue.add(() => slowTask('1')),
        queue.add(() => slowTask('2')),
        queue.add(() => slowTask('3')),
        queue.add(() => slowTask('4')),
        queue.add(() => slowTask('5')),
      ]

      const settled = await Promise.allSettled(promises)
      const rejected = settled.filter(r => r.status === 'rejected')

      expect(rejected.length).toBeGreaterThanOrEqual(2)
    })

    it('should not drop tasks when maxQueueLength is not set', async () => {
      const queue = new PromiseQueue(1)

      const task = async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 5))
        return id
      }

      const promises = [
        queue.add(() => task('1')),
        queue.add(() => task('2')),
        queue.add(() => task('3')),
        queue.add(() => task('4')),
        queue.add(() => task('5')),
      ]

      const settled = await Promise.allSettled(promises)
      const rejected = settled.filter(r => r.status === 'rejected')

      expect(rejected.length).toBe(0)
    })

    it('should accept maxQueueLength of 0 as valid configuration', async () => {
      const queue = new PromiseQueue(1, 0)

      const result = await queue.add(async () => 'success')
      expect(result).toBe('success')
    })
  })

  describe('onIdle', () => {
    it('should resolve immediately when queue is empty', async () => {
      const queue = new PromiseQueue(1)
      await expect(queue.onIdle()).resolves.toBeUndefined()
    })

    it('should wait for all tasks to complete', async () => {
      const queue = new PromiseQueue(2)
      let completed = 0

      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        completed++
      }

      queue.add(task)
      queue.add(task)
      queue.add(task)

      await queue.onIdle()
      expect(completed).toBe(3)
    })

    it('should wait for queued tasks to start and complete', async () => {
      const queue = new PromiseQueue(1)
      const order: string[] = []

      const task = async (id: string) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        order.push(id)
      }

      queue.add(() => task('1'))
      queue.add(() => task('2'))
      queue.add(() => task('3'))

      await queue.onIdle()
      expect(order).toEqual(['1', '2', '3'])
    })

    it('should handle multiple onIdle calls', async () => {
      const queue = new PromiseQueue(1)

      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      queue.add(task)

      await Promise.all([queue.onIdle(), queue.onIdle(), queue.onIdle()])

      expect(queue.activeCount).toBe(0)
      expect(queue.pendingCount).toBe(0)
    })

    it('should work after tasks complete', async () => {
      const queue = new PromiseQueue(1)

      await queue.add(async () => 'done')
      await queue.onIdle()

      expect(queue.activeCount).toBe(0)
      expect(queue.pendingCount).toBe(0)
    })
  })

  describe('activeCount', () => {
    it('should return 0 for empty queue', () => {
      const queue = new PromiseQueue(1)
      expect(queue.activeCount).toBe(0)
    })

    it('should return number of running tasks', async () => {
      const queue = new PromiseQueue(2)
      let resolveTask1!: () => void
      let resolveTask2!: () => void

      const task1 = new Promise<void>(resolve => {
        resolveTask1 = resolve
      })
      const task2 = new Promise<void>(resolve => {
        resolveTask2 = resolve
      })

      queue.add(() => task1)
      queue.add(() => task2)

      await new Promise(resolve => setTimeout(resolve, 5))
      expect(queue.activeCount).toBe(2)

      resolveTask1()
      await new Promise(resolve => setTimeout(resolve, 5))
      expect(queue.activeCount).toBe(1)

      resolveTask2()
      await queue.onIdle()
      expect(queue.activeCount).toBe(0)
    })

    it('should not exceed maxConcurrency', async () => {
      const queue = new PromiseQueue(2)
      let resolve1!: () => void
      let resolve2!: () => void
      let resolve3!: () => void

      const task1 = new Promise<void>(resolve => {
        resolve1 = resolve
      })
      const task2 = new Promise<void>(resolve => {
        resolve2 = resolve
      })
      const task3 = new Promise<void>(resolve => {
        resolve3 = resolve
      })

      queue.add(() => task1)
      queue.add(() => task2)
      queue.add(() => task3)

      await new Promise(resolve => setTimeout(resolve, 5))
      expect(queue.activeCount).toBe(2)
      expect(queue.pendingCount).toBe(1)

      resolve1()
      await new Promise(resolve => setTimeout(resolve, 5))
      expect(queue.activeCount).toBe(2)

      resolve2()
      resolve3()
      await queue.onIdle()
      expect(queue.activeCount).toBe(0)
    })
  })

  describe('pendingCount', () => {
    it('should return 0 for empty queue', () => {
      const queue = new PromiseQueue(1)
      expect(queue.pendingCount).toBe(0)
    })

    it('should return number of waiting tasks', async () => {
      const queue = new PromiseQueue(1)
      let resolveTask!: () => void

      const blockingTask = new Promise<void>(resolve => {
        resolveTask = resolve
      })

      queue.add(() => blockingTask)
      await new Promise(resolve => setTimeout(resolve, 5))

      expect(queue.activeCount).toBe(1)
      expect(queue.pendingCount).toBe(0)

      queue.add(async () => 'task2')
      queue.add(async () => 'task3')

      expect(queue.pendingCount).toBe(2)

      resolveTask()
      await queue.onIdle()
      expect(queue.pendingCount).toBe(0)
    })

    it('should decrease as tasks start executing', async () => {
      const queue = new PromiseQueue(1)
      let resolve1!: () => void
      let resolve2!: () => void
      let resolve3!: () => void

      const task1 = new Promise<void>(resolve => {
        resolve1 = resolve
      })
      const task2 = new Promise<void>(resolve => {
        resolve2 = resolve
      })
      const task3 = new Promise<void>(resolve => {
        resolve3 = resolve
      })

      queue.add(() => task1)
      queue.add(() => task2)
      queue.add(() => task3)

      await new Promise(resolve => setTimeout(resolve, 5))
      expect(queue.pendingCount).toBe(2)

      resolve1()
      await new Promise(resolve => setTimeout(resolve, 5))
      expect(queue.pendingCount).toBe(1)

      resolve2()
      await new Promise(resolve => setTimeout(resolve, 5))
      expect(queue.pendingCount).toBe(0)

      resolve3()
      await queue.onIdle()
    })
  })

  describe('clear', () => {
    it('should clear all pending tasks', async () => {
      const queue = new PromiseQueue(1)
      let resolveTask!: () => void

      const blockingTask = new Promise<void>(resolve => {
        resolveTask = resolve
      })

      queue.add(() => blockingTask)
      await new Promise(resolve => setTimeout(resolve, 5))

      queue.add(async () => 'task2')
      queue.add(async () => 'task3')

      expect(queue.pendingCount).toBe(2)

      queue.clear()

      expect(queue.pendingCount).toBe(0)
      expect(queue.activeCount).toBe(1)

      resolveTask()
      await queue.onIdle()
    })

    it('should not affect running tasks', async () => {
      const queue = new PromiseQueue(1)
      let completed = false

      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        completed = true
      }

      const promise = queue.add(task)
      await new Promise(resolve => setTimeout(resolve, 5))

      queue.clear()

      await promise
      expect(completed).toBe(true)
    })

    it('should work on empty queue', () => {
      const queue = new PromiseQueue(1)
      expect(() => queue.clear()).not.toThrow()
      expect(queue.pendingCount).toBe(0)
    })

    it('should allow adding new tasks after clear', async () => {
      const queue = new PromiseQueue(1)
      let resolveTask!: () => void

      const blockingTask = new Promise<void>(resolve => {
        resolveTask = resolve
      })

      const firstPromise = queue.add(() => blockingTask)
      await new Promise(resolve => setTimeout(resolve, 5))

      queue.add(async () => 'task2')
      queue.add(async () => 'task3')

      queue.clear()

      resolveTask()
      await firstPromise

      const result = await queue.add(async () => 'new-task')
      expect(result).toBe('new-task')
    })

    it('should clear multiple times', async () => {
      const queue = new PromiseQueue(1)
      let resolveTask!: () => void

      const blockingTask = new Promise<void>(resolve => {
        resolveTask = resolve
      })

      queue.add(() => blockingTask)
      await new Promise(resolve => setTimeout(resolve, 5))

      queue.add(async () => 'task2')
      queue.clear()
      expect(queue.pendingCount).toBe(0)

      queue.add(async () => 'task3')
      queue.clear()
      expect(queue.pendingCount).toBe(0)

      resolveTask()
      await queue.onIdle()
    })
  })

  describe('integration scenarios', () => {
    it('should handle mixed success and failure tasks', async () => {
      const queue = new PromiseQueue(2)
      const results = await Promise.allSettled([
        queue.add(async () => 'success1'),
        queue.add(async () => {
          throw new Error('error1')
        }),
        queue.add(async () => 'success2'),
        queue.add(async () => {
          throw new Error('error2')
        }),
      ])

      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('rejected')
      expect(results[2].status).toBe('fulfilled')
      expect(results[3].status).toBe('rejected')
    })

    it('should handle rapid task additions', async () => {
      const queue = new PromiseQueue(3)
      const tasks = Array.from({ length: 20 }, (_, i) =>
        queue.add(async () => {
          await new Promise(resolve => setTimeout(resolve, 5))
          return i
        }),
      )

      const results = await Promise.all(tasks)
      expect(results).toEqual(Array.from({ length: 20 }, (_, i) => i))
    })

    it('should handle tasks added after some complete', async () => {
      const queue = new PromiseQueue(1)

      await queue.add(async () => 'first')

      const result = await queue.add(async () => 'second')
      expect(result).toBe('second')
    })

    it('should work with different return types', async () => {
      const queue = new PromiseQueue(1)

      const stringResult = await queue.add(async () => 'string')
      const numberResult = await queue.add(async () => 42)
      const boolResult = await queue.add(async () => true)
      const arrayResult = await queue.add(async () => [1, 2, 3])
      const objResult = await queue.add(async () => ({ key: 'value' }))

      expect(stringResult).toBe('string')
      expect(numberResult).toBe(42)
      expect(boolResult).toBe(true)
      expect(arrayResult).toEqual([1, 2, 3])
      expect(objResult).toEqual({ key: 'value' })
    })

    it('should handle long-running and short-running tasks mixed', async () => {
      const queue = new PromiseQueue(2)
      const order: number[] = []

      const longTask = async (id: number) => {
        await new Promise(resolve => setTimeout(resolve, 30))
        order.push(id)
        return id
      }

      const shortTask = async (id: number) => {
        await new Promise(resolve => setTimeout(resolve, 5))
        order.push(id)
        return id
      }

      await Promise.all([
        queue.add(() => longTask(1)),
        queue.add(() => shortTask(2)),
        queue.add(() => shortTask(3)),
        queue.add(() => longTask(4)),
      ])

      expect(order).toHaveLength(4)
      expect(order).toContain(1)
      expect(order).toContain(2)
      expect(order).toContain(3)
      expect(order).toContain(4)
    })
  })
})
