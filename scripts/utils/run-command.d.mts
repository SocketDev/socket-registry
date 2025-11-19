/** Type definitions for run-command.mjs utility. */

import type { SpawnOptions } from 'node:child_process'

export interface CommandSpec {
  command: string
  args?: string[]
  options?: SpawnOptions
}

export interface QuietResult {
  exitCode: number
  stdout: string
  stderr: string
}

export function runCommand(
  command: string,
  args?: string[],
  options?: SpawnOptions,
): Promise<number>

export function runCommandSync(
  command: string,
  args?: string[],
  options?: SpawnOptions,
): number

export function runPnpmScript(
  scriptName: string,
  extraArgs?: string[],
  options?: SpawnOptions,
): Promise<number>

export function runSequence(commands: CommandSpec[]): Promise<number>

export function runParallel(commands: CommandSpec[]): Promise<number[]>

export function runCommandQuiet(
  command: string,
  args?: string[],
  options?: SpawnOptions,
): Promise<QuietResult>

export function runCommandStrict(
  command: string,
  args?: string[],
  options?: SpawnOptions,
): Promise<void>

export function runCommandQuietStrict(
  command: string,
  args?: string[],
  options?: SpawnOptions,
): Promise<Omit<QuietResult, 'exitCode'>>

export function logAndRun(
  description: string,
  command: string,
  args?: string[],
  options?: SpawnOptions,
): Promise<number>
