import { asFixtureScripts } from './asFixtureScripts';

const PREPARE_HOP = 'npm run prepare:rhachet';

/**
 * .what = a fixture package.json with its `prepare:rhachet` entry set, and the `prepare`
 *   hop to it, beside every other entry it held
 * .why = the merge is pure, so it reads as one step between the read and the write
 * .note = an extant `prepare` is kept: the hop is appended to it only when absent, as
 *   `rhx init` does (`findsertPrepareWithPrepareRhachetEntry`)
 */
export const asFixturePackageJsonWithPrepare = (input: {
  pkg: Record<string, unknown>;
  command: string;
}): Record<string, unknown> => {
  const scripts = asFixtureScripts({ pkg: input.pkg });
  const prepareExtant = scripts['prepare'] ?? null;
  const prepare = (() => {
    if (!prepareExtant) return PREPARE_HOP;
    if (prepareExtant.includes(PREPARE_HOP)) return prepareExtant;
    return `${prepareExtant} && ${PREPARE_HOP}`;
  })();
  return {
    ...input.pkg,
    scripts: { ...scripts, 'prepare:rhachet': input.command, prepare },
  };
};
