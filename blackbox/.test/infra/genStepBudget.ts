import { MalfunctionError } from 'helpful-errors';

/**
 * .what = one timed step: where it ran, what it did, what it cost, what it was allowed
 */
interface StepSpend {
  label: string;
  kind: string;
  ms: number;
  budgetMs: number;
}

/**
 * .what = a per-kind time budget for the expensive steps of a slow suite, with a ledger
 * .why = a slow suite names no culprit on its own; each budgeted step records its cost, a
 *   step past its budget fails at once and names itself, and every later step short
 *   circuits, so a slow run stops where the cost is instead of after it
 *
 * .note = the label is jest's current test name plus the step's detail, so the ledger reads
 *   as "which then, which command, how long"
 */
export const genStepBudget = <TKind extends string>(input: {
  budgetsMs: Record<TKind, number>;
}) => {
  const ledger: StepSpend[] = [];
  const state: { overrun: StepSpend | null } = { overrun: null };

  // the step's name: the test it runs in, then what it does
  const asLabel = (detail: string): string =>
    `${expect.getState().currentTestName ?? '(setup)'} › ${detail}`;

  // refuse to start once any prior step blew its budget
  const assertNoPriorOverrun = (label: string): void => {
    if (state.overrun)
      throw new MalfunctionError('short circuit: a prior step blew its budget', {
        step: label,
        prior: state.overrun,
      });
  };

  // record the spend; a spend past budget marks the overrun and fails the step, with
  //   whatever evidence the step left, so the overrun names its cause and not just its time
  const settle = (spend: StepSpend, evidence?: unknown): void => {
    ledger.push(spend);
    if (spend.ms <= spend.budgetMs) return;
    state.overrun = spend;
    throw new MalfunctionError(
      `step over budget: ${spend.kind} took ${spend.ms}ms > ${spend.budgetMs}ms`,
      { step: spend, ...(evidence === undefined ? {} : { evidence }) },
    );
  };

  /**
   * .what = run a sync step under its kind's budget
   * .note = the step receives its budget, so it can kill its own child at the bound
   * .note = `asEvidence` picks what of the result an overrun shows — a child's stderr
   *   tells a hang from a slow start
   */
  const withBudgetSync = <T>(
    step: { kind: TKind; detail: string; asEvidence?: (result: T) => unknown },
    fn: (budgetMs: number) => T,
  ): T => {
    const label = asLabel(step.detail);
    assertNoPriorOverrun(label);
    const budgetMs = input.budgetsMs[step.kind];
    const startedAt = Date.now();
    const result = fn(budgetMs);
    settle(
      { label, kind: step.kind, ms: Date.now() - startedAt, budgetMs },
      step.asEvidence?.(result),
    );
    return result;
  };

  /**
   * .what = run an async step under its kind's budget; a bound hit fails the step
   * .note = the race cannot cancel `fn`, so on a bound hit the step joins `fn` before it
   *         throws: no work outlives the overrun it reports. `fn` should still end its own
   *         work by `budgetMs` (e.g. pass it as a child-kill timeout), or the join waits on
   *         it until jest's own timeout
   */
  const withBudget = async <T>(
    step: { kind: TKind; detail: string },
    fn: (budgetMs: number) => Promise<T>,
  ): Promise<T> => {
    const label = asLabel(step.detail);
    assertNoPriorOverrun(label);
    const budgetMs = input.budgetsMs[step.kind];
    const startedAt = Date.now();
    const timer: { handle: NodeJS.Timeout | null } = { handle: null };
    const bound = new Promise<never>((_, reject) => {
      timer.handle = setTimeout(
        () =>
          reject(
            new MalfunctionError('step bound hit', { step: label, budgetMs }),
          ),
        budgetMs + 1,
      );
    });
    const work = fn(budgetMs);
    try {
      const result = await Promise.race([work, bound]);
      settle({ label, kind: step.kind, ms: Date.now() - startedAt, budgetMs });
      return result;
    } catch (error) {
      // a bound hit is an overrun; join the work so none outlives it, then record the spend
      //   so the ledger and the short circuit see it
      const isBoundHit =
        error instanceof MalfunctionError && error.message.startsWith('step bound hit');
      if (!isBoundHit) throw error;
      const [late] = await Promise.allSettled([work]);
      settle(
        { label, kind: step.kind, ms: Date.now() - startedAt, budgetMs },
        { lateSettlement: late.status },
      );
      throw error;
    } finally {
      if (timer.handle) clearTimeout(timer.handle);
    }
  };

  /**
   * .what = the ledger as text, costliest first, with a per-kind subtotal
   */
  const asLedgerReport = (): string => {
    const total = ledger.reduce((sum, spend) => sum + spend.ms, 0);
    const byKind = Object.entries(
      ledger.reduce<Record<string, { ms: number; count: number }>>(
        (acc, spend) => ({
          ...acc,
          [spend.kind]: {
            ms: (acc[spend.kind]?.ms ?? 0) + spend.ms,
            count: (acc[spend.kind]?.count ?? 0) + 1,
          },
        }),
        {},
      ),
    ).sort((a, b) => b[1].ms - a[1].ms);
    const rows = [...ledger]
      .sort((a, b) => b.ms - a.ms)
      .map(
        (spend) =>
          `  ${spend.ms > spend.budgetMs ? '💥' : '  '} ${String(spend.ms).padStart(6)}ms / ${String(spend.budgetMs).padStart(6)}ms  ${spend.kind.padEnd(12)} ${spend.label}`,
      );
    return [
      `step budget ledger — ${ledger.length} steps, ${total}ms`,
      ...byKind.map(
        ([kind, sum]) => `  ${kind.padEnd(12)} ${String(sum.ms).padStart(7)}ms over ${sum.count}`,
      ),
      '',
      ...rows,
    ].join('\n');
  };

  return { withBudget, withBudgetSync, asLedgerReport };
};
