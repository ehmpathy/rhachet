import { ConstraintError } from 'helpful-errors';

import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

import { assertKeyrackEnvIsSpecified } from './assertKeyrackEnvIsSpecified';
import type { ContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { getAllKeyrackSlugsForEnv } from './getAllKeyrackSlugsForEnv';
import { getAllKeyrackSweepTargetsForEnv } from './getAllKeyrackSweepTargetsForEnv';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';

/**
 * .what = grant all keys for a repo from keyrack
 * .why = reusable operation for CLI and SDK repo grant flow
 *
 * .note = requires keyrack.yml manifest in repo
 * .note = uses env from manifest or explicit input
 */
export const getAllKeyrackGrantsByRepo = async (
  input: {
    env: string | null;
    allow?: { dangerous?: boolean };

    /**
     * .what = enumerate every reach a key declares, not the reachless one alone
     * .why = the answer differs by the NAMESPACE the caller emits into, and only the caller
     *        knows which it holds:
     *          - a STRUCTURED surface (`get --for repo` tree / json) can carry N reaches
     *            per key, so it enumerates — anything less reads as "this repo holds one key"
     *            when it holds three
     *          - a FLAT surface (`export FOO=`, `process.env`, a secret map) has ONE slot per
     *            bare key name, so it physically cannot carry N. it keeps the reachless value
     *            and ANNOUNCES the reaches it could not carry, which is the same fact
     *            said in the only way that namespace permits
     *
     * .note = default FALSE, so every extant caller is byte-identical (e1). the enumerate is
     *         opt-in at the one surface that can hold the result, never a widening applied
     *         underneath callers that would then throw on a collision they cannot settle
     */
    with?: { reaches?: boolean };
  },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt[]> => {
  // validate manifest exists
  if (!context.repoManifest) {
    throw new ConstraintError(
      'no keyrack.yml found in repo. --for repo requires keyrack.yml',
      { hint: 'create keyrack.yml in repo root with env and key definitions' },
    );
  }

  // determine env from manifest or input
  const env = assertKeyrackEnvIsSpecified({
    manifest: context.repoManifest,
    env: input.env,
  });

  // enumerate every (key × reach) the repo declares, when the caller can hold them
  // .note = the single-key form is what carries a `reach`, so the enumerate walks targets
  //         through it rather than widen the repo form. that is the SAME `attemptGrantKey`
  //         the repo form loops, so a reachless target here is byte-identical to the sweep
  //         below — the branches differ in what they ASK for, never in how they ask (e1)
  if (input.with?.reaches) {
    const targets = getAllKeyrackSweepTargetsForEnv({
      manifest: context.repoManifest,
      env,
    });
    const attemptsPerTarget: KeyrackGrantAttempt[] = [];
    for (const target of targets) {
      attemptsPerTarget.push(
        await getKeyrackKeyGrant(
          {
            for: { key: target.slug },
            reach: target.reach,
            allow: input.allow,
          },
          context,
        ),
      );
    }
    return attemptsPerTarget;
  }

  // get all slugs for this env
  const slugs = getAllKeyrackSlugsForEnv({
    manifest: context.repoManifest,
    env,
  });

  // grant all keys
  const attempts = await getKeyrackKeyGrant(
    {
      for: { repo: true },
      env: input.env ?? undefined,
      slugs,
      allow: input.allow,
    },
    context,
  );

  return attempts;
};
