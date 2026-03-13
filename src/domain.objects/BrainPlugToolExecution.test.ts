import { given, then, when } from 'test-fns';

import type { BrainPlugToolExecution } from './BrainPlugToolExecution';

describe('BrainPlugToolExecution', () => {
  given('[case1] valid BrainPlugToolExecution with success signal', () => {
    const execution: BrainPlugToolExecution<
      { email: string },
      { id: string; name: string }
    > = {
      exid: 'tool-call-001',
      slug: 'stripe-customer-lookup',
      input: { email: 'alice@example.com' },
      signal: 'success',
      output: { id: 'cus_123', name: 'Alice' },
      metrics: {
        cost: {
          time: { milliseconds: 150 },
        },
      },
    };

    when('[t0] execution is created', () => {
      then('has all properties', () => {
        expect(execution.exid).toEqual('tool-call-001');
        expect(execution.slug).toEqual('stripe-customer-lookup');
        expect(execution.input).toEqual({ email: 'alice@example.com' });
        expect(execution.output).toEqual({ id: 'cus_123', name: 'Alice' });
        expect(execution.signal).toEqual('success');
        expect(execution.metrics.cost.time).toEqual({ milliseconds: 150 });
      });

      then('output is typed as TOutput when signal is success', () => {
        if (execution.signal === 'success') {
          // type narrows to TOutput
          expect(execution.output.id).toEqual('cus_123');
          expect(execution.output.name).toEqual('Alice');
        }
      });
    });
  });

  given('[case2] signal variant: error:constraint', () => {
    const execution: BrainPlugToolExecution<
      { email: string },
      { id: string; name: string }
    > = {
      exid: 'tool-call-003',
      slug: 'stripe-customer-lookup',
      input: { email: 'bob@example.com' },
      signal: 'error:constraint',
      output: { error: new Error('customer not found') },
      metrics: { cost: { time: { milliseconds: 200 } } },
    };

    when('[t0] execution is created', () => {
      then('signal is error:constraint', () => {
        expect(execution.signal).toEqual('error:constraint');
      });

      then('output contains Error object', () => {
        // signal is 'error:constraint' so output is { error: Error }
        expect(execution.output.error).toBeInstanceOf(Error);
        expect(execution.output.error.message).toEqual('customer not found');
      });
    });
  });

  given('[case3] signal variant: error:malfunction', () => {
    const execution: BrainPlugToolExecution<
      { email: string },
      { id: string; name: string }
    > = {
      exid: 'tool-call-004',
      slug: 'stripe-customer-lookup',
      input: { email: 'charlie@example.com' },
      signal: 'error:malfunction',
      output: { error: new Error('ECONNREFUSED: stripe api unreachable') },
      metrics: { cost: { time: { milliseconds: 5000 } } },
    };

    when('[t0] execution is created', () => {
      then('signal is error:malfunction', () => {
        expect(execution.signal).toEqual('error:malfunction');
      });

      then('output contains Error object', () => {
        // signal is 'error:malfunction' so output is { error: Error }
        expect(execution.output.error).toBeInstanceOf(Error);
        expect(execution.output.error.message).toEqual(
          'ECONNREFUSED: stripe api unreachable',
        );
      });
    });
  });

  given('[case4] discriminated union narrows output type', () => {
    when('[t0] signal check', () => {
      then('success narrows to TOutput', () => {
        const execution: BrainPlugToolExecution<
          { path: string },
          { content: string }
        > = {
          exid: 'tool-call-005',
          slug: 'read-file',
          input: { path: '/tmp/test.txt' },
          signal: 'success',
          output: { content: 'hello world' },
          metrics: { cost: { time: { milliseconds: 50 } } },
        };

        // signal is 'success' so output is TOutput
        expect(execution.output.content).toEqual('hello world');
      });

      then('error narrows to { error: Error }', () => {
        const execution: BrainPlugToolExecution<
          { path: string },
          { content: string }
        > = {
          exid: 'tool-call-006',
          slug: 'read-file',
          input: { path: '/tmp/notfound.txt' },
          signal: 'error:constraint',
          output: { error: new Error('file not found') },
          metrics: { cost: { time: { milliseconds: 10 } } },
        };

        // signal is 'error:constraint' so output is { error: Error }
        expect(execution.output.error.message).toEqual('file not found');
      });
    });
  });

  given('[case5] metrics with IsoDuration format', () => {
    when('[t0] created with IsoDuration shape', () => {
      then('accepts milliseconds (150ms)', () => {
        const execution: BrainPlugToolExecution = {
          exid: 'tool-call-007',
          slug: 'fast-tool',
          input: {},
          signal: 'success',
          output: {},
          metrics: { cost: { time: { milliseconds: 150 } } },
        };
        expect(execution.metrics.cost.time).toEqual({ milliseconds: 150 });
      });

      then('accepts seconds (5 seconds)', () => {
        const execution: BrainPlugToolExecution = {
          exid: 'tool-call-008',
          slug: 'slow-tool',
          input: {},
          signal: 'success',
          output: {},
          metrics: { cost: { time: { seconds: 5 } } },
        };
        expect(execution.metrics.cost.time).toEqual({ seconds: 5 });
      });

      then('accepts mixed units (1 minute 30 seconds)', () => {
        const execution: BrainPlugToolExecution = {
          exid: 'tool-call-009',
          slug: 'very-slow-tool',
          input: {},
          signal: 'success',
          output: {},
          metrics: { cost: { time: { minutes: 1, seconds: 30 } } },
        };
        expect(execution.metrics.cost.time).toEqual({
          minutes: 1,
          seconds: 30,
        });
      });
    });
  });
});
