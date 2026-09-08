import { ConstraintError } from 'helpful-errors';

import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';

import { asKeyrackKeySlug } from './asKeyrackKeySlug';
import { asKeyrackOrgMismatchRefusal } from './asKeyrackOrgMismatchRefusal';
import { asKeyrackSlugFullOrNull } from './asKeyrackSlugFullOrNull';
import type { ContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';

/**
 * .what = grant a single key from keyrack
 * .why = reusable operation for CLI and SDK single-key grant flow
 *
 * .note = handles both raw key names and full slugs
 * .note = uses manifest for slug construction when available
 * .note = falls back to org param when no manifest
 * .note = org shapes the SLUG (provenance — whose manifest declared it); reach never does.
 *         the slug stays `$org.$env.$key` so the manifest gate still passes, and the
 *         destination rides its own axis
 */
export const getOneKeyrackGrantByKey = async (
  input: {
    key: string;
    env: string | null;
    org?: string;

    /**
     * .what = the reach asked for; absent means the reachless key
     * .why = OPTIONAL, not nullable — a deliberate exception to
     *        `rule.forbid.undefined-inputs`, because `reach` rides into `KeyrackKeyGrant`
     *        and onto the daemon wire, where e16 requires it be DROPPED when absent
     * .note = the drop hazard that rule guards is covered structurally: a reach-ask that
     *         finds no key THROWS (e6), never falls back to the reachless one
     */
    reach?: KeyrackKeyReach;

    allow?: { dangerous?: boolean };
  },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt> => {
  // construct slug from key input
  const { slug } = (() => {
    // decode the key ONCE. this is the SAME question `asKeyrackKeySlug` asks of the same
    // string (:48), and the same one `asKeyrackSlugOrgKind` is built on — a key that names
    // its own org rides through verbatim; a bare name must be composed. it was spelled
    // inline twice below before it was hoisted here, and two copies of a parser is exactly
    // how `isKeyrackSlugMachineWide` and `isKeyrackSlugRepoBound` came to disagree about
    // `@all.badenv.FOO`
    const slugFull = asKeyrackSlugFullOrNull({ key: input.key });

    // ⚠️ an explicit `--org @all` bypasses the manifest gate — this is the DOCUMENTED
    //    cross-org read (`access keys across orgs`), and it is deliberate. a full slug
    //    passes through with its own org segment intact, so `--org @all --key
    //    ehmpathy.prep.FOO` reads another org's key from this repo without an ORG_MISMATCH
    //    throw. that is the capability, not an oversight
    // .note = `asKeyrackAskOrg` declines to call that same ask machine-wide, so the manifest
    //         still LOADS for it. the two are consistent in the safe direction: the load is
    //         paid (an understatement costs one read), and the gate is waived only here,
    //         where the caller asked for it by name
    if (input.org === '@all') {
      if (slugFull) return { slug: input.key };
      const envFallback = input.env ?? 'all';
      return { slug: `@all.${envFallback}.${input.key}` };
    }

    // if manifest exists, use asKeyrackKeySlug for full validation
    if (context.repoManifest) {
      // fail fast if org param doesn't match manifest org
      if (input.org && input.org !== context.repoManifest.org) {
        // .note = `key: null` deliberately, so the two FLAG sites render the same tree. the key
        //   is not lost to the human — the `ran:` line echoes the whole command, `--key` and
        //   all. a `key:` leaf is reserved for the SLUG sites, where the org came FROM the key
        throw asKeyrackOrgMismatchRefusal({
          givenBy: 'flag',
          orgRejected: input.org,
          orgOfManifest: context.repoManifest.org,
          key: null,
        });
      }
      return asKeyrackKeySlug({
        key: input.key,
        env: input.env,
        manifest: context.repoManifest,
      });
    }

    // no manifest — a key that names its own org needs none
    if (slugFull) return { slug: input.key };

    // no manifest but org provided - construct slug
    if (input.org) {
      const envFallback = input.env ?? 'all';
      return { slug: `${input.org}.${envFallback}.${input.key}` };
    }

    // no manifest, no full slug, no org - cannot construct
    // provide sudo-specific hint when env is sudo
    if (input.env === 'sudo') {
      throw new ConstraintError(
        'no keyrack.yml found in repo. for sudo credentials without keyrack.yml, use --org @all',
      );
    }
    throw new ConstraintError(
      `cannot construct slug for key '${input.key}' without keyrack.yml. use full slug format (org.env.KEY) or add keyrack.yml to repo.`,
    );
  })();

  return getKeyrackKeyGrant(
    { for: { key: slug }, reach: input.reach, allow: input.allow },
    context,
  );
};
