/**
 * @file Tests for the multi-Janus MCP shim — the JSON-RPC dispatch
 *   (handleRequest), the tool→janus-argv mappings, and workspace discovery. The
 *   live `janus`-shelling path (runJanus) is exercised by the smoke test in the
 *   README, not here (it needs the binary + a real .janus/); these cover the
 *   pure logic.
 */

import { describe, expect, test } from 'vitest'

import {
  createTicketArgs,
  listTicketsArgs,
  nextTicketArgs,
  showTicketArgs,
  updateStatusArgs,
} from '../../../scripts/fleet/janus-multi-runner.mts'
import { handleRequest } from '../../../scripts/fleet/janus-multi-mcp.mts'
import type { ToolDef } from '../../../scripts/fleet/janus-multi-mcp.mts'
import { readFleetRepoNames } from '../../../scripts/fleet/janus-multi-workspace.mts'

describe('janus-multi tool→argv mappings', () => {
  test('createTicketArgs builds create with optional flags', () => {
    expect(createTicketArgs({ title: 'T' })).toEqual(['create', 'T'])
    expect(
      createTicketArgs({
        description: 'D',
        externalRef: 'gh-1',
        priority: 0,
        ticketType: 'task',
        title: 'T',
      }),
    ).toEqual([
      'create',
      'T',
      '--description',
      'D',
      '--type',
      'task',
      '--priority',
      '0',
      '--external-ref',
      'gh-1',
    ])
  })

  test('nextTicketArgs requests JSON + honors limit', () => {
    expect(nextTicketArgs()).toEqual(['next', '--json'])
    expect(nextTicketArgs(3)).toEqual(['next', '--json', '--limit', '3'])
    // A non-positive limit is ignored (no --limit appended).
    expect(nextTicketArgs(0)).toEqual(['next', '--json'])
  })

  test('list/show/status args request JSON', () => {
    expect(listTicketsArgs()).toEqual(['ls', '--json'])
    expect(showTicketArgs('abc')).toEqual(['show', 'abc', '--json'])
    expect(updateStatusArgs('abc', 'complete')).toEqual([
      'status',
      'abc',
      'complete',
      '--json',
    ])
  })
})

describe('janus-multi JSON-RPC dispatch', () => {
  test('initialize returns server info + protocol version', () => {
    const res = handleRequest({ id: 1, jsonrpc: '2.0', method: 'initialize' })
    expect(res?.['result']).toMatchObject({
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'janus-multi' },
    })
  })

  test('notifications/initialized and id-less requests return no response', () => {
    expect(
      handleRequest({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    ).toBeUndefined()
    expect(
      handleRequest({ jsonrpc: '2.0', method: 'tools/list' }),
    ).toBeUndefined()
  })

  test('tools/list returns every tool with a workspace param (except list_workspaces)', () => {
    const res = handleRequest({ id: 2, jsonrpc: '2.0', method: 'tools/list' })
    expect(res).toBeDefined()
    const tools = (res!['result'] as { tools: ToolDef[] }).tools
    const names = tools.map(t => t.name)
    expect(names).toContain('list_workspaces')
    expect(names).toContain('create_ticket')
    expect(names).toContain('get_next_available_ticket')
    for (const t of tools) {
      if (t.name === 'list_workspaces') {
        continue
      }
      const props = (t.inputSchema as { properties: Record<string, unknown> })
        .properties
      expect(props).toHaveProperty('workspace')
    }
  })

  test('tools/call on an unknown workspace returns an isError naming the set', () => {
    const res = handleRequest({
      id: 3,
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        arguments: { title: 'x', workspace: 'definitely-not-a-repo' },
        name: 'create_ticket',
      },
    })
    expect(res).toBeDefined()
    const result = res!['result'] as {
      isError?: boolean | undefined
      content: Array<{ text: string }>
    }
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toContain('unknown workspace')
    expect(result.content[0]!.text).toContain('definitely-not-a-repo')
  })

  test('unknown method returns a JSON-RPC method-not-found error', () => {
    const res = handleRequest({ id: 9, jsonrpc: '2.0', method: 'bogus/method' })
    expect(res).toBeDefined()
    expect((res!['error'] as { code: number }).code).toBe(-32_601)
  })
})

describe('janus-multi workspace discovery', () => {
  test('readFleetRepoNames returns the fleet registry names (includes known repos)', () => {
    const names = readFleetRepoNames()
    // The wheelhouse-canonical registry always lists the core fleet repos.
    expect(names.length).toBeGreaterThan(0)
    expect(names).toContain('socket-addon')
  })
})
