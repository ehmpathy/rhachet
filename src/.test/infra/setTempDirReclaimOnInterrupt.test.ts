import { MalfunctionError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { setTempDirReclaimOnInterrupt } from './setTempDirReclaimOnInterrupt';

/**
 * .what = invokes the handler the function registers for one signal, with process.exit stubbed
 * .why = the handler's whole contract is (teardown, then exit with 128 + signal) — observable
 *        without a real signal, by capture of what it registers and what it exits with
 */
const invokeHandlerFor = async (input: {
  signal: 'SIGINT' | 'SIGTERM';
  teardown: () => Promise<void>;
  withinMs: number;
}): Promise<{ exitCode: number | undefined; errors: unknown[][] }> => {
  const handlers = new Map<string, () => void>();
  jest
    .spyOn(process, 'once')
    .mockImplementation(((event: string, handler: () => void) => {
      handlers.set(event, handler);
      return process;
    }) as typeof process.once);
  const exited = new Promise<number | undefined>((done) => {
    jest
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number) => {
        done(code);
        return undefined as never;
      }) as typeof process.exit);
  });
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    setTempDirReclaimOnInterrupt({
      teardown: input.teardown,
      withinMs: input.withinMs,
    });
    // a dropped registration must fail as itself, never as a jest timeout on `exited`
    const handler = handlers.get(input.signal);
    if (!handler)
      throw new MalfunctionError(`no ${input.signal} handler was registered`, {
        registered: [...handlers.keys()],
        hint: 'setTempDirReclaimOnInterrupt must register a process.once handler per signal',
      });
    handler();
    const exitCode = await exited;
    return { exitCode, errors: errorSpy.mock.calls };
  } finally {
    jest.restoreAllMocks();
  }
};

describe('setTempDirReclaimOnInterrupt', () => {
  given('[case1] a run is signaled', () => {
    when('[t0] SIGINT arrives, as a ctrl-c sends it', () => {
      const teardown = jest.fn(async () => {});
      const result = useBeforeAll(async () =>
        invokeHandlerFor({ signal: 'SIGINT', teardown, withinMs: 1_000 }),
      );

      then('the teardown runs, and the run exits 130', () => {
        expect(teardown).toHaveBeenCalledTimes(1);
        expect(result.exitCode).toEqual(130);
      });
    });

    when('[t1] SIGTERM arrives, as a ci cancel sends it', () => {
      const teardown = jest.fn(async () => {});
      const result = useBeforeAll(async () =>
        invokeHandlerFor({ signal: 'SIGTERM', teardown, withinMs: 1_000 }),
      );

      then('the teardown runs, and the run exits 143', () => {
        expect(teardown).toHaveBeenCalledTimes(1);
        expect(result.exitCode).toEqual(143);
      });
    });
  });

  given('[case2] the teardown itself throws', () => {
    when('[t0] SIGINT arrives', () => {
      const result = useBeforeAll(async () =>
        invokeHandlerFor({
          signal: 'SIGINT',
          teardown: async () => {
            throw new MalfunctionError('reclaim fault', {
              fixture: 'reclaim fault',
              hint: 'an injected fault: this case proves the handler reports it and still exits',
            });
          },
          withinMs: 1_000,
        }),
      );

      then('the run still exits 130 — a reclaim fault never turns an interrupt into a hang', () => {
        expect(result.exitCode).toEqual(130);
      });

      then('the fault is reported under a qualified header, with the age gate as backstop', () => {
        const header = String(result.errors[0]?.[0]);
        expect(header).toContain('💥 MalfunctionError: the SIGINT reclaim');
        expect(header).toContain('the test-fns age gate will reclaim them');
        expect(header).toMatchSnapshot();
      });
    });
  });

  given('[case3] the teardown never settles', () => {
    when('[t0] SIGINT arrives', () => {
      const result = useBeforeAll(async () =>
        invokeHandlerFor({
          signal: 'SIGINT',
          teardown: () => new Promise<void>(() => {}),
          withinMs: 50,
        }),
      );

      then('the run still exits 130 once the bound elapses', () => {
        expect(result.exitCode).toEqual(130);
      });

      then('the overrun is reported, with the bound it exceeded', () => {
        expect(String(result.errors[0]?.[1])).toContain(
          'the SIGINT reclaim took longer than 50ms',
        );
      });
    });
  });
});
