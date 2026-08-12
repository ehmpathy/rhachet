import { MalfunctionError } from 'helpful-errors';

import { asKeyrackInfraRegistryContent } from './asKeyrackInfraRegistryContent';
import { asKeyrackInfraRegistryGithubAppCommitMessage } from './asKeyrackInfraRegistryGithubAppCommitMessage';
import { asKeyrackInfraRegistryGithubApps } from './asKeyrackInfraRegistryGithubApps';
import { KEYRACK_INFRA_REGISTRY_PATH } from './constants';
import { getKeyrackInfraRepoSlug } from './getKeyrackInfraRepoSlug';
import { getGhFileContent } from './gh/getGhFileContent';
import type { GhRun } from './gh/runGh';
import { setGhFileContent } from './gh/setGhFileContent';
import { isKeyrackInfraRegistryGithubAppRegistered } from './isKeyrackInfraRegistryGithubAppRegistered';
import type { KeyrackInfraRegistryGithubApp } from './KeyrackInfraRegistryGithubApp';

/**
 * .what = how many extra times we re-read + retry the registry write on a conflict
 * .why = a handful of retries absorbs realistic concurrent-registration contention;
 *        a bound guarantees termination even if contention is pathological
 */
const REGISTRY_WRITE_RETRIES = 4;

/**
 * .what = findsert a github-app entry into an org's keyrack-infra registry
 * .why = admin setup auto-registers apps so members can later discover them
 *
 * .note = idempotent by app slug: re-register of the same app is a no-op write-skip
 * .note = only non-secret ids are stored; the pem never enters the registry
 * .note = returns { status } so callers can distinguish a no-op skip ('found') from
 *         an actual registry write ('created') — for observability and tests
 * .note = concurrency-safe via an optimistic-lock on the read sha: the write passes
 *         the sha it read, so a concurrent writer that wrote first turns this write
 *         into a conflict. on a conflict we re-read + retry (bounded) until we reach
 *         either 'found' (the concurrent write already registered our app) or
 *         'created' (we win a later round) — a lost update never happens and no hard
 *         failure surfaces
 */
export const genKeyrackInfraRegistryGithubApp = (
  input: { org: string; entry: KeyrackInfraRegistryGithubApp },
  context: { ghRun: GhRun },
): { status: 'found' | 'created' } => {
  const repo = getKeyrackInfraRepoSlug({ org: input.org });

  // bounded optimistic-concurrency loop: read → check → append → write-against-sha;
  // on a write conflict (a concurrent writer wrote first) re-read + retry until we
  // converge to 'found' or 'created', or exhaust the retry budget and fail loud
  for (
    let attemptsLeft = REGISTRY_WRITE_RETRIES;
    attemptsLeft >= 0;
    attemptsLeft--
  ) {
    const file = getGhFileContent(
      { repo, path: KEYRACK_INFRA_REGISTRY_PATH },
      context,
    );

    // parse extant registry (or start empty when the file is absent)
    const appsBefore = file
      ? asKeyrackInfraRegistryGithubApps({ content: file.content })
      : [];

    // findsert: skip write when the slug is already registered (possibly just now
    // by the concurrent writer we lost a prior race to)
    if (
      isKeyrackInfraRegistryGithubAppRegistered({
        apps: appsBefore,
        slug: input.entry.slug,
      })
    )
      return { status: 'found' };

    // append the new entry and persist against the sha we just read
    const appsAfter = [...appsBefore, input.entry];
    const result = setGhFileContent(
      {
        repo,
        path: KEYRACK_INFRA_REGISTRY_PATH,
        content: asKeyrackInfraRegistryContent({ apps: appsAfter }),
        message: asKeyrackInfraRegistryGithubAppCommitMessage({
          slug: input.entry.slug,
        }),
        sha: file?.sha ?? null,
      },
      context,
    );

    // clean write → we registered it
    if (result.effect === 'set') return { status: 'created' };

    // conflict → a concurrent writer changed the file first; loop re-reads + retries
  }

  // sustained contention exhausted our retries → fail loud
  throw new MalfunctionError(
    'keyrack-infra registry write could not converge under concurrent writes',
    {
      repo,
      slug: input.entry.slug,
      hint: 'retry the registration; another writer updates the registry concurrently',
    },
  );
};
