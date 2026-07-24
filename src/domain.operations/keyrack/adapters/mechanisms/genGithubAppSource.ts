import { ConstraintError } from 'helpful-errors';

import { asKeyrackKeyOrg } from '../../asKeyrackKeyOrg';
import { genKeyrackInfraRegistryGithubApp } from '../../infra/genKeyrackInfraRegistryGithubApp';
import { getKeyrackInfraCandidateApps } from '../../infra/getKeyrackInfraCandidateApps';
import type { GhRun } from '../../infra/gh/runGh';
import { asGithubAppSource } from './asGithubAppSource';
import { getPemContent } from './getPemContent';
import { getPemPath } from './getPemPath';
import { getSelectedApp } from './getSelectedApp';

/**
 * .what = gen the github-app source credential blob via guided setup
 * .why = the testable core of mechAdapterGithubApp.acquireForSet — every external
 *        dependency (gh runner, readline prompt) is injected via context, so the
 *        full discover → select → register → read-pem → build-source flow can be
 *        exercised with fakes instead of a real terminal or gh cli
 *
 * .note = gen (not get): it findserts the chosen app into the registry as a side
 *         effect, then produces the source blob from the app ids + pem
 *
 * .note = reads as narrative: discover candidates → select app → get pem path →
 *         read pem → auto-register → build source blob
 * .note = registration happens only after the pem is in hand: a failed or aborted
 *         pem read must not leave an orphan registry entry that points to an app for
 *         which no credential was ever stored (pit-of-success under partial failure)
 * .note = the real composition root (the adapter) injects runGh + a readline prompt;
 *         tests inject a fake GhRun + a scripted question
 */
export const genGithubAppSource = async (
  input: { keySlug: string },
  context: { ghRun: GhRun; question: (prompt: string) => Promise<string> },
): Promise<{ source: string }> => {
  const { question } = context;
  const ctxGh = { ghRun: context.ghRun };

  // derive org from the fully-qualified key slug (org.env.name)
  const org = asKeyrackKeyOrg({ slug: input.keySlug });

  // discover candidate apps (mandatory infra gate + registry-first + admin fallback)
  const candidates = getKeyrackInfraCandidateApps({ org }, ctxGh);

  // guard: no apps available to choose
  if (candidates.length === 0)
    throw new ConstraintError(`no github apps available for ${org}`, {
      hint: 'install a github app in the org, then register it via keyrack',
    });

  // select the app (auto when single, else prompt the human)
  const selectedApp = await getSelectedApp({ candidates, question });

  // prompt for the pem path (with ~ expansion) and read its content — do this
  // before registration so a failed/aborted pem read cannot leave an orphan entry.
  // on a read failure, close the open 'which github app secret?' sub-tree with a leaf
  // before the ConstraintError interrupts, so the guided tree never abandons an open
  // ├─ branch mid-flow (rule.require.treestruct-output). the set action still renders the
  // full caller-fixable error as the 🐢 blocked treestruct
  const pemPath = await getPemPath({ question });
  const privateKey = ((): string => {
    try {
      return getPemContent({ path: pemPath });
    } catch (error) {
      console.log('   │  └─ ✋ could not read pem file');
      throw error;
    }
  })();

  // confirm capture only AFTER the read succeeds — the `pem read ✓` leaf closes the
  // secret sub-tree getPemPath opened. a failed read throws before this line, so the
  // confirmation never precedes a failure (no false success signal for an unreadable pem).
  // .note = "read" (not "received") is precise: the leaf means the file content was read
  //         off disk, not merely that the path string was accepted as input
  console.log('   │  └─ pem read ✓');

  // auto-register the chosen app now that the pem is in hand (findsert; no-op when
  // already registered) — a member who reads the registry always finds a usable app
  genKeyrackInfraRegistryGithubApp({ org, entry: selectedApp }, ctxGh);

  // build the stored source blob from the app ids + pem
  const source = asGithubAppSource({
    appId: selectedApp.appId,
    installationId: selectedApp.installationId,
    privateKey,
  });

  return { source };
};
