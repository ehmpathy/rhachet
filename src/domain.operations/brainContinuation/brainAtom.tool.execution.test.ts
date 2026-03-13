/**
 * .what = unit tests for BrainPlugToolInvocation and BrainPlugToolExecution
 * .why = validates domain object construction, signals, and type safety
 *
 * .note = type contracts (calls: null for repl, etc.) are tested in
 *   BrainAtom.types.test.ts and BrainRepl.types.test.ts
 */
import { given, then, when } from 'test-fns';

import type { BrainPlugToolExecution } from '@src/domain.objects/BrainPlugToolExecution';
import { BrainPlugToolInvocation } from '@src/domain.objects/BrainPlugToolInvocation';

describe('BrainPlugToolInvocation', () => {
  given('[case1] tool invocation construction', () => {
    when('[t0] created with required fields', () => {
      const invocation = new BrainPlugToolInvocation({
        exid: 'tool-call-123',
        slug: 'customer-lookup',
        input: { email: 'alice@example.com' },
      });

      then('has exid for correlation', () => {
        expect(invocation.exid).toEqual('tool-call-123');
      });

      then('has slug for tool identification', () => {
        expect(invocation.slug).toEqual('customer-lookup');
      });

      then('has input data', () => {
        expect(invocation.input).toEqual({ email: 'alice@example.com' });
      });
    });
  });

  given('[case2] typed tool invocation', () => {
    type CustomerInput = { email: string };

    when('[t0] created with typed input', () => {
      const invocation = new BrainPlugToolInvocation<CustomerInput>({
        exid: 'typed-inv',
        slug: 'customer-lookup',
        input: { email: 'typed@example.com' },
      });

      then('input property is typed', () => {
        // type-level: email is string
        const email: string = invocation.input.email;
        expect(email).toEqual('typed@example.com');
      });
    });
  });
});

describe('BrainPlugToolExecution', () => {
  given('[case1] success execution', () => {
    type CustomerInput = { email: string };
    type CustomerOutput = { id: string; name: string };

    when('[t0] tool executes successfully', () => {
      const execution: BrainPlugToolExecution<CustomerInput, CustomerOutput> = {
        exid: 'tool-call-123',
        slug: 'customer-lookup',
        input: { email: 'alice@example.com' },
        signal: 'success',
        output: { id: 'cus_123', name: 'Alice' },
        metrics: { cost: { time: { milliseconds: 150 } } },
      };

      then('has success signal', () => {
        expect(execution.signal).toEqual('success');
      });

      then('has output data', () => {
        expect(execution.output).toEqual({ id: 'cus_123', name: 'Alice' });
      });

      then('has time metric', () => {
        expect(execution.metrics.cost.time).toEqual({ milliseconds: 150 });
      });

      then('correlates to invocation via exid', () => {
        expect(execution.exid).toEqual('tool-call-123');
      });

      then('preserves input for round-trip', () => {
        expect(execution.input).toEqual({ email: 'alice@example.com' });
      });
    });
  });

  given('[case2] constraint error execution', () => {
    type CustomerInput = { email: string };
    type CustomerOutput = { id: string; name: string };

    when('[t0] tool fails due to business constraint', () => {
      const execution: BrainPlugToolExecution<CustomerInput, CustomerOutput> = {
        exid: 'tool-call-456',
        slug: 'customer-lookup',
        input: { email: 'bob@example.com' },
        signal: 'error:constraint',
        output: { error: new Error('customer not found') },
        metrics: { cost: { time: { milliseconds: 50 } } },
      };

      then('has constraint error signal', () => {
        expect(execution.signal).toEqual('error:constraint');
      });

      then('has error details in output', () => {
        expect(execution.output.error.message).toEqual('customer not found');
      });
    });
  });

  given('[case3] malfunction error execution', () => {
    type CustomerInput = { email: string };
    type CustomerOutput = { id: string; name: string };

    when('[t0] tool breaks unexpectedly', () => {
      const execution: BrainPlugToolExecution<CustomerInput, CustomerOutput> = {
        exid: 'tool-call-789',
        slug: 'customer-lookup',
        input: { email: 'charlie@example.com' },
        signal: 'error:malfunction',
        output: { error: new Error('ECONNREFUSED: service unreachable') },
        metrics: { cost: { time: { milliseconds: 3000 } } },
      };

      then('has malfunction error signal', () => {
        expect(execution.signal).toEqual('error:malfunction');
      });

      then('has error details in output', () => {
        expect(execution.output.error.message).toEqual(
          'ECONNREFUSED: service unreachable',
        );
      });

      then('captures failure duration', () => {
        expect(execution.metrics.cost.time).toEqual({ milliseconds: 3000 });
      });
    });
  });

  given('[case4] typed tool execution', () => {
    type CustomerInput = { email: string };
    type CustomerOutput = { id: string; name: string };

    when('[t0] created with typed input and output', () => {
      const execution: BrainPlugToolExecution<CustomerInput, CustomerOutput> = {
        exid: 'typed-exec',
        slug: 'customer-lookup',
        input: { email: 'typed@example.com' },
        signal: 'success',
        output: { id: 'cus_typed', name: 'Typed User' },
        metrics: { cost: { time: { milliseconds: 100 } } },
      };

      then('input is typed', () => {
        const email: string = execution.input.email;
        expect(email).toEqual('typed@example.com');
      });

      then('output is typed', () => {
        expect(execution.output.id).toEqual('cus_typed');
        expect(execution.output.name).toEqual('Typed User');
      });
    });
  });

  given('[case5] mixed signals in parallel executions', () => {
    type InvoiceInput = { customerId: string };
    type InvoiceOutput = { id: string; amount: number }[];
    type SubInput = { customerId: string };
    type SubOutput = { id: string };

    when('[t0] multiple executions with different signals', () => {
      const successExec: BrainPlugToolExecution<InvoiceInput, InvoiceOutput> = {
        exid: 'inv-1',
        slug: 'get-invoices',
        input: { customerId: 'cus_123' },
        signal: 'success',
        output: [{ id: 'inv_1', amount: 100 }],
        metrics: { cost: { time: { milliseconds: 120 } } },
      };

      const failExec: BrainPlugToolExecution<SubInput, SubOutput> = {
        exid: 'inv-2',
        slug: 'get-subscriptions',
        input: { customerId: 'cus_123' },
        signal: 'error:malfunction',
        output: { error: new Error('timeout') },
        metrics: { cost: { time: { milliseconds: 5000 } } },
      };

      then('each execution has its own signal', () => {
        expect(successExec.signal).toEqual('success');
        expect(failExec.signal).toEqual('error:malfunction');
      });

      then('executions can be collected into array', () => {
        const executions: BrainPlugToolExecution[] = [successExec, failExec];
        expect(executions).toHaveLength(2);
      });
    });
  });
});
