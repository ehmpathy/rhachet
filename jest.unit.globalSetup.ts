/**
 * .what = the unit run's globalSetup: the run's temp-dir reclaim, and naught else
 * .why = the unit tier sources no keys, so its globalSetup is the shared reclaim wire-up alone
 *        (see src/.test/infra/setAutopruneForRun.ts)
 */
// eslint-disable-next-line import/no-default-export
export default async (globalConfig: {
  globalTeardown?: string | null;
}): Promise<void> => {
  const { setAutopruneForRun } = await import(
    './src/.test/infra/setAutopruneForRun'
  );
  await setAutopruneForRun({ globalConfig });
};
