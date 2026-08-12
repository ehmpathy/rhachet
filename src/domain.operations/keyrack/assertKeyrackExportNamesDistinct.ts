import { ConstraintError } from 'helpful-errors';

import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

import { asKeyrackKeyEnv } from './asKeyrackKeyEnv';
import { asKeyrackKeyName } from './asKeyrackKeyName';
import { asKeyrackKeyOrg } from './asKeyrackKeyOrg';

/**
 * .what = refuse a shell export set in which two grants would claim one variable name
 * .why = a shell variable namespace is flat, and `asKeyrackKeyName` drops the org and the
 *        env — so two keys that differ on ANY axis above the name emit the same
 *        `export FOO=` and the last line wins. a caller who evals that output holds one
 *        key with no hint the other was overwritten
 *
 * .note = this is a silent LOSS, not a wrong-reach substitution: both values were
 *         legitimately held. it is the only failure shape in this design that SUCCEEDS,
 *         which is what makes it the most dangerous one and why it throws (e23)
 * .note = a single-key emit is untouched, so today's output is unchanged (e1)
 * .note = THREE axes can collide here, and the fix differs per axis — so the hint is derived
 *         from which one actually differs, never assumed. an `--env all` sweep collides two
 *         ENVS of one name (a defect that predates reach); a manifest-less full-slug ask
 *         collides two ORGS; a reach-ask collides two REACHES. to offer `--reach` for an
 *         env collision would name a fix that cannot work (rule.require.errors-name-the-fix)
 * .note = the axes are checked OUTERMOST first — org, then env, then reach — because a slug
 *         reads `org.env.name` with the reach hung below it. so the outermost axis on
 *         which two keys differ is the only one whose fix always separates them: to narrow
 *         `--env` cannot help a pair that spans two orgs, and to name a `--reach` cannot help
 *         a pair that spans two envs. the innermost-first order would hand a human the
 *         narrower fix and let them obey it into the same refusal
 *
 * .note = THREE surfaces flatten a grant set onto bare key names, and each is a distinct
 *         product: the cli `source` command, the sdk `keyrack.source`, and the brain-creds
 *         `getKeyrackKeySecrets`. before this assertion reached all three they disagreed on
 *         what a collision MEANS — the cli threw, `sourceAllKeysIntoEnv` kept the FIRST
 *         (`!process.env[name]`), and `getKeyrackKeySecrets` kept the LAST
 *         (`Object.fromEntries`). one collision, three answers, none of them announced
 * .note = `hints` is optional and per-caller for the same reason the message is shared: the
 *         MESSAGE states the invariant, so it cannot drift; the HINT names a fix a human
 *         copy-pastes, and the fix is surface-shaped (`--reach` on a cli, an input field on an
 *         sdk). the cli-shaped default keeps the extant caller and its snapshots byte-identical
 */
export const assertKeyrackExportNamesDistinct = (input: {
  attempts: KeyrackGrantAttempt[];
  hints?: {
    forReachCollision: string;
    forEnvCollision: string;
    forOrgCollision: string;
  };
}): void => {
  const seenByName = new Map<
    string,
    KeyrackGrantAttempt & { status: 'granted' }
  >();

  for (const attempt of input.attempts) {
    if (attempt.status !== 'granted') continue;

    const keyName = asKeyrackKeyName({ slug: attempt.grant.slug });
    const collided = seenByName.get(keyName);

    if (collided) {
      // address each by its FULL identity, so a human sees which two keys clashed rather
      // than one name twice — `testorg.prep.FOO` vs `testorg.prod.FOO` reads at a glance
      const addressOfFirst = asKeyrackKeySlugAtReach({
        slug: collided.grant.slug,
        reach: collided.grant.reach,
      });
      const addressOfSecond = asKeyrackKeySlugAtReach({
        slug: attempt.grant.slug,
        reach: attempt.grant.reach,
      });

      // the outermost axis on which the two differ decides the fix (see the precedence note)
      const hint = ((): string => {
        if (
          asKeyrackKeyOrg({ slug: collided.grant.slug }) !==
          asKeyrackKeyOrg({ slug: attempt.grant.slug })
        )
          return (
            input.hints?.forOrgCollision ??
            `source one org at a time; use --key to name one, since --env cannot separate two orgs`
          );
        if (
          asKeyrackKeyEnv({ slug: collided.grant.slug }) !==
          asKeyrackKeyEnv({ slug: attempt.grant.slug })
        )
          return (
            input.hints?.forEnvCollision ??
            `source one env at a time; narrow --env, or use --key to name one`
          );
        if (addressOfFirst === addressOfSecond)
          // every axis matches, so these are ONE key asked for twice. no narrower fix
          // applies — each of the three hints above would send a human to change an axis
          // that is already identical (rule.require.errors-name-the-fix)
          return `name each key once; '${addressOfFirst}' was asked for twice`;
        return (
          input.hints?.forReachCollision ??
          `source one reach at a time; add --reach to name which one you want`
        );
      })();

      throw new ConstraintError(
        `two keys would both export '${keyName}': '${addressOfFirst}' and '${addressOfSecond}' — a shell variable name carries neither env nor reach, so the second would silently overwrite the first`,
        {
          keyName,
          addresses: [addressOfFirst, addressOfSecond],
          hint,
        },
      );
    }

    seenByName.set(keyName, attempt);
  }
};
