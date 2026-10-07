import { BUDGET_TOKENS_DEFAULT } from './findsertBudgetIntoBootYml';

/**
 * .what = one report row per repo boot guard this run created
 * .why = a guard already in place is not news, so only a creation earns a row
 */
export const asBootGuardReportLines = (input: {
  guard: {
    budget: 'created' | 'extant' | 'absent';
  };
}): string[] => {
  const rowBudget = `+ boot.yml  budget.tokens: ${BUDGET_TOKENS_DEFAULT}`;
  return [input.guard.budget === 'created' ? rowBudget : null].filter(
    (row): row is string => row !== null,
  );
};
