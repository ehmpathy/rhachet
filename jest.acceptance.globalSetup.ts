import { asAcceptanceBoxHeader } from './blackbox/.test/infra/asAcceptanceBoxHeader';
import { emitResidueNotice } from './blackbox/.test/infra/emitResidueNotice';
import { asRunMinterMark, RUN_MINTER_ENV_KEY } from './blackbox/.test/infra/getOneRunIdMintedHere';
import { setAcceptanceBoxPriority } from './blackbox/.test/infra/setAcceptanceBoxPriority';

/**
 * .what = source api keys from keyrack into process.env, once per jest run
 * .why =
 *   - yield the box: a bounded priority on a shared box, and a header that names box, width, priority
 *   - mint the test-fns autoprune run id, so temp dirs are reclaimed at teardown
 *   - prevent time wasted on tests that fail due to absent api keys
 *   - prevent agents from quit when they have access to credentials
 *
 * .note = a globalSetup, never a setupFilesAfterEnv: `keyrack.source` spawns a full
 *   `rhx keyrack get --for repo` child (~20s on a loaded box). per suite file, that was paid once
 *   per file; here it is paid once per run. the env it sets reaches every suite — in-band suites
 *   share this process, and a forked worker inherits its env
 * .note = hardcoded to --owner ehmpath because we expect only ehmpaths to work in this repo
 * .note = keyrack already prefers passthrough (checks env vars first)
 * .note = mode 'lenient' — acceptance tests self-provision credentials per-subprocess (isolated
 *   HOME, fixtures, a local SSM stand-in), so this global source is a best-effort convenience, not
 *   a hard gate. a strict source would exit(2) the WHOLE suite whenever any env.test key (e.g. the
 *   SSO-backed AWS_PROFILE) is locked on an unattended host — even though no acceptance test reads
 *   it. lenient injects whatever is unlocked and skips the rest, so a test that truly needs a
 *   credential fails in that test with a legible error (never a blanket global halt). on CI the
 *   credentials are present, so behaviour is unchanged. mirrors the lenient source in useKeyrack.
 */
// eslint-disable-next-line import/no-default-export
export default async (globalConfig: {
  globalTeardown?: string | null;
  maxWorkers: number;
  rootDir: string;
}): Promise<void> => {
  // yield the box before jest forks its workers, so every worker and grandchild inherits it
  const yielded = setAcceptanceBoxPriority({ env: process.env });

  // name the box, the width jest resolved, and the priority, to stderr beside jest's own output
  process.stderr.write(
    `${asAcceptanceBoxHeader({
      box: yielded.box.box,
      maxWorkersDefault: yielded.box.maxWorkersDefault,
      maxWorkers: globalConfig.maxWorkers,
      cores: yielded.cores,
      niceNow: yielded.niceNow,
    })}\n`,
  );

  // name the pile earlier runs left, so it is not read as a fix that failed
  await emitResidueNotice({ repoRoot: globalConfig.rootDir });

  // source api keys into process.env. BEFORE the run id is minted: the source spawns a keyrack
  //   child, and a child that carries the run id is one the leak sweep would end
  const { keyrack } = await import('rhachet/keyrack');
  keyrack.source({ env: 'test', owner: 'ehmpath', mode: 'lenient' });

  // mint this run's autoprune id before workers fork; jest allows one globalSetup, so we compose it.
  //   every process a test spawns inherits it, which is how the leak sweep finds them
  const { default: setupAutoprune } = await import('test-fns/autoprune.setup.jest');
  await setupAutoprune(globalConfig);

  // mark this process as the minter, so the leak sweep reads this id and never an inherited one
  process.env[RUN_MINTER_ENV_KEY] = asRunMinterMark({
    pid: process.pid,
    runId: process.env.TEST_FNS_RUN ?? '',
  });
};
