/**
 * Per-request token usage capture for the `claude-stream-json` family
 * (#3408 / #3547 follow-up B).
 *
 * Before this change the parser read `message.id` only to dedup streamed
 * text/thinking and dropped it, and never read `message.usage` at all — the
 * whole run collapsed into a single run-level `result.usage` record with no
 * request id. These tests pin the new behavior:
 *
 *  1. Every assistant `message` with a `message.usage` emits one
 *     `request_usage` event keyed by `requestId` (the provider `msg_…` id).
 *  2. The per-request token sum reconciles against the run-level
 *     `result.usage` aggregate — the correctness anchor from the issue.
 *  3. The replay mock (`mocks/lib/format-claude.mjs`) emits per-message usage
 *     so the capture path is verifiable without live provider calls.
 */

import { describe, expect, it } from 'vitest';
import { createClaudeStreamHandler } from '../../src/runtimes/claude-stream.js';
// Untyped replay-mock helper (plain .mjs, no shipped declarations) — imported
// so the per-request capture path is validated against the real mock output.
// @ts-expect-error: no type declarations for the mocks helper
import { renderAsClaude } from '../../../../mocks/lib/format-claude.mjs';

type Event = Record<string, unknown>;

function collect(): { events: Event[]; sink: (ev: Event) => void } {
  const events: Event[] = [];
  return { events, sink: (ev) => events.push(ev) };
}

function feed(handler: ReturnType<typeof createClaudeStreamHandler>, objs: object[]) {
  for (const obj of objs) handler.feed(JSON.stringify(obj) + '\n');
}

function requestUsages(events: Event[]) {
  return events.filter((e) => e.type === 'request_usage');
}

describe('claude-stream per-request usage capture', () => {
  it('emits one request_usage per assistant message keyed by message.id', () => {
    const { events, sink } = collect();
    const handler = createClaudeStreamHandler(sink);

    feed(handler, [
      {
        type: 'assistant',
        message: {
          id: 'msg_req_1',
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'tu_1', name: 'Read', input: {} }],
          stop_reason: 'tool_use',
          usage: {
            input_tokens: 100,
            output_tokens: 20,
            cache_creation_input_tokens: 5,
            cache_read_input_tokens: 7,
          },
        },
      },
      {
        type: 'assistant',
        message: {
          id: 'msg_req_2',
          role: 'assistant',
          content: [{ type: 'text', text: 'done' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 50, output_tokens: 10 },
        },
      },
    ]);

    const usages = requestUsages(events);
    expect(usages).toHaveLength(2);
    expect(usages[0]).toMatchObject({
      type: 'request_usage',
      requestId: 'msg_req_1',
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        cache_creation_input_tokens: 5,
        cache_read_input_tokens: 7,
      },
    });
    expect(usages[1]).toMatchObject({
      type: 'request_usage',
      requestId: 'msg_req_2',
      usage: { input_tokens: 50, output_tokens: 10 },
    });
  });

  it('does not emit request_usage when message.usage is absent', () => {
    const { events, sink } = collect();
    const handler = createClaudeStreamHandler(sink);
    feed(handler, [
      {
        type: 'assistant',
        message: {
          id: 'msg_no_usage',
          role: 'assistant',
          content: [{ type: 'text', text: 'hi' }],
          stop_reason: 'end_turn',
        },
      },
    ]);
    expect(requestUsages(events)).toHaveLength(0);
  });

  it('reconciles per-request token sum against the run-level result.usage', () => {
    const { events, sink } = collect();
    const handler = createClaudeStreamHandler(sink);

    feed(handler, [
      {
        type: 'assistant',
        message: {
          id: 'msg_a',
          content: [{ type: 'tool_use', id: 't1', name: 'Read', input: {} }],
          stop_reason: 'tool_use',
          usage: { input_tokens: 30, output_tokens: 4, cache_read_input_tokens: 1 },
        },
      },
      {
        type: 'assistant',
        message: {
          id: 'msg_b',
          content: [{ type: 'text', text: 'ok' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 12, output_tokens: 6, cache_read_input_tokens: 2 },
        },
      },
      {
        type: 'result',
        subtype: 'success',
        usage: {
          input_tokens: 42,
          output_tokens: 10,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 3,
        },
      },
    ]);

    const usages = requestUsages(events);
    const sum = (k: string) =>
      usages.reduce((acc, e) => acc + (((e.usage as Record<string, number>)[k]) ?? 0), 0);

    const runLevel = events.find((e) => e.type === 'usage')!.usage as Record<string, number>;
    expect(sum('input_tokens')).toBe(runLevel.input_tokens);
    expect(sum('output_tokens')).toBe(runLevel.output_tokens);
    expect(sum('cache_read_input_tokens')).toBe(runLevel.cache_read_input_tokens);
  });

  it('reconciles per-request usage end-to-end through the replay mock', async () => {
    const out: string[] = [];
    await renderAsClaude(
      [
        { type: 'meta', model: 'claude', total_tokens: 100, duration_ms: 0 },
        { type: 'tool_call', obs_id: 'o1', name: 'Read', input: {} },
        { type: 'tool_result', obs_id: 'o1', output: 'x', status: 'ok' },
        { type: 'tool_call', obs_id: 'o2', name: 'Write', input: {} },
        { type: 'tool_result', obs_id: 'o2', output: 'y', status: 'ok' },
        { type: 'report', content: 'all done' },
      ],
      { emit: (s: string) => out.push(s), noDelay: true, sessionId: 'sess' },
    );

    const { events, sink } = collect();
    const handler = createClaudeStreamHandler(sink);
    handler.feed(out.join(''));

    const usages = requestUsages(events);
    // 2 tool_call messages + 1 report message = 3 assistant messages.
    expect(usages).toHaveLength(3);
    for (const u of usages) {
      expect(typeof u.requestId).toBe('string');
      expect((u.requestId as string).startsWith('msg_')).toBe(true);
    }

    const sum = (k: string) =>
      usages.reduce((acc, e) => acc + (((e.usage as Record<string, number>)[k]) ?? 0), 0);
    const runLevel = events.find((e) => e.type === 'usage')!.usage as Record<string, number>;
    expect(sum('input_tokens')).toBe(runLevel.input_tokens);
    expect(sum('output_tokens')).toBe(runLevel.output_tokens);
    expect(sum('output_tokens')).toBe(100);
    expect(sum('cache_read_input_tokens')).toBe(runLevel.cache_read_input_tokens);
  });
});
