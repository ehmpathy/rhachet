import { ConstraintError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';
import { withStdoutPrefix } from '@src/infra/withStdoutPrefix';

import { asKeyrackKeyName } from '../asKeyrackKeyName';
import { asKeyrackKeyOrg } from '../asKeyrackKeyOrg';
import { asKeyrackFillTargetBranch } from '../cli/asKeyrackFillTargetBranch';
import type { ContextKeyrack } from '../genContextKeyrack';
import { genContextKeyrack } from '../genContextKeyrack';
import { genContextKeyrackGrantGet } from '../genContextKeyrackGrantGet';
import { getAllKeyrackSlugsForEnv } from '../getAllKeyrackSlugsForEnv';
import { getKeyrackKeyGrant } from '../getKeyrackKeyGrant';
import { inferKeyrackVaultFromKey } from '../inferKeyrackVaultFromKey';
import { unlockKeyrackKeys } from '../session/unlockKeyrackKeys';
import { setKeyrackKey } from '../setKeyrackKey';
import { assertKeyrackFillRoundtrip } from './assertKeyrackFillRoundtrip';
import { getAllKeyrackFillTargets } from './getAllKeyrackFillTargets';
import { getOneKeyrackFillTargetCount } from './getOneKeyrackFillTargetCount';
import { isKeyrackFillProbeMiss } from './isKeyrackFillProbeMiss';

/**
 * .what = result for a single key × owner fill attempt
 * .why = enables per-key outcome reports
 *
 * .note = exported so a THROWN error can carry the results so far. a mid-loop halt
 *         otherwise hands a programmatic caller a bare message, and the N targets already
 *         provisioned become invisible — work that was done, reported as if it was not
 *         (rule.require.failloud)
 */
export type FillKeyResult = {
  slug: string;
  owner: string;
  /**
   * .what = the reach this attempt provisioned, when the repo declared one
   * .why = a slug alone no longer names one key, so a result must say which it was
   */
  reach?: KeyrackKeyReach;
  /**
   * .what = what became of this target
   * .why = `set` and `skipped` are both VERIFIED outcomes — the key is usable either way,
   *        one newly provisioned and one found already vaulted
   *
   * .note = there is deliberately no `failed`. every real failure throws, so a failure
   *         that does not throw has no way to occur, and a bucket that can never fill is
   *         a bucket that misleads
   */
  status: 'set' | 'skipped';
};

/**
 * .what = fills keyrack keys from repo manifest for specified owners
 * .why = eliminates adhoc fill commands; manifest becomes source of truth
 *
 * .note = for each key × each owner: set → unlock → get (roundtrip verification)
 * .note = skips already-configured keys unless --refresh
 * .note = outputs tree-format progress to console
 */
export const fillKeyrackKeys = async (
  input: {
    env: string;
    owners: string[];
    /**
     * .what = supplemental prikeys to consider for manifest decryption
     * .why = extends default discovery (ssh-agent, ~/.ssh/id_ed25519, etc)
     */
    prikeys: string[];
    key: string | null;
    refresh: boolean;
    repair: boolean;
    allowDangerous: boolean;
  },
  context: {
    gitroot: string;
    /**
     * .what = emit a line to stdout
     * .why = enables tests without emit mocks; separates orchestration from output
     */
    emit?: (line: string) => void;
  },
): Promise<{
  results: FillKeyResult[];
  summary: { set: number; skipped: number };
}> => {
  // load repo manifest
  const repoManifest = await daoKeyrackRepoManifest.get({
    gitroot: context.gitroot,
  });
  if (!repoManifest) {
    throw new ConstraintError('no keyrack.yml found in repo', {
      gitroot: context.gitroot,
    });
  }

  // get all keys for env
  const allSlugs = getAllKeyrackSlugsForEnv({
    manifest: repoManifest,
    env: input.env,
  });

  // filter to specific key if requested
  const slugs = input.key
    ? allSlugs.filter((s) => asKeyrackKeyName({ slug: s }) === input.key)
    : allSlugs;

  // handle empty or not found
  if (slugs.length === 0) {
    if (input.key) {
      throw new ConstraintError(
        `key ${input.key} not found in manifest for env=${input.env}`,
      );
    }
    (context.emit ?? console.log)('');
    (context.emit ?? console.log)(`🔐 keyrack fill (env: ${input.env})`);
    (context.emit ?? console.log)('   └─ no keys found');
    (context.emit ?? console.log)('');
    return {
      results: [],
      summary: { set: 0, skipped: 0 },
    };
  }

  // fail-fast: verify all owners have accessible manifests BEFORE user input
  // .note = also eliminates duplicate manifest loads per key × owner
  type OwnerContexts = {
    owner: string | null;
    ownerInput: string;
    ownerLabel: string;
    contextKeyrack: ContextKeyrack;
    contextGet: Awaited<ReturnType<typeof genContextKeyrackGrantGet>>;
  };
  const contextsByOwner = new Map<string, OwnerContexts>();
  for (const ownerInput of input.owners) {
    const owner = ownerInput === 'default' ? null : ownerInput;
    const ownerLabel = owner ?? 'default';
    const loaded = await (async () => {
      try {
        // generate keyrack context and load host manifest
        const contextKeyrack = genContextKeyrack({
          owner,
          prikeys: input.prikeys,
          repoManifest: repoManifest ?? null,
          gitroot: context.gitroot,
        });
        const manifest = await daoKeyrackHostManifest.get(
          { owner },
          contextKeyrack,
        );

        contextsByOwner.set(ownerInput, {
          owner,
          ownerInput,
          ownerLabel,
          contextKeyrack,
          contextGet: await genContextKeyrackGrantGet({
            owner,
            gitroot: context.gitroot,
          }),
        });
        return manifest;
      } catch (error) {
        throw new ConstraintError(
          `no available prikey for owner=${ownerLabel}`,
          {
            owner: ownerLabel,
            cause: error instanceof Error ? error : undefined,
          },
        );
      }
    })();

    // ⚠️ an ABSENT manifest returns null rather than throws, so it slips past the catch
    //    above and the owner reads as fine. it is not: `setKeyrackKeyHost` hard-requires
    //    `context.hostManifest`, so a fill for an owner with no manifest CANNOT succeed —
    //    it only fails later, from deeper in, as an `MalfunctionError` (exit 1) for
    //    what is plainly a caller's typo (`rule.require.exit-code-semantics`)
    // .note = the guard sits OUTSIDE the try on purpose. inside it, the catch would rewrap
    //         this into `no available prikey`, which names the wrong cause and buries the
    //         `keyrack init` hint the caller actually needs
    // .note = this belongs HERE rather than in the fill probe's allowlist. the probe answers
    //         "is this key vaulted yet?", and "i cannot read this owner at all" is not an
    //         answer to that question — it is a fault that must never reach the loop
    //         (`rule.require.solve-at-cause`)
    if (!loaded)
      throw new ConstraintError(
        `no keyrack host manifest for owner=${ownerLabel}`,
        {
          owner: ownerLabel,
          hint: `run: rhx keyrack init${owner ? ` --owner ${owner}` : ''}`,
        },
      );
  }

  // emit header
  (context.emit ?? console.log)('');
  (context.emit ?? console.log)(
    `🔐 keyrack fill (env: ${input.env}, keys: ${slugs.length}, owners: ${input.owners.length})`,
  );

  // for each key
  const results: FillKeyResult[] = [];
  // .note = `.entries()` rather than a `let` counter — the index is read, never reassigned,
  //         so a mutable `let` claims a freedom the loop does not use
  //         (`rule.require.immutable-vars`). it also drops the `slugs[i]!` non-null assertion,
  //         because the entry hands back the element itself
  for (const [slugIdx, slug] of slugs.entries()) {
    const keyName = asKeyrackKeyName({ slug });
    (context.emit ?? console.log)('');
    (context.emit ?? console.log)(
      `🔑 key ${slugIdx + 1}/${slugs.length}, ${keyName}, for ${input.owners.length} owner${input.owners.length > 1 ? 's' : ''}`,
    );

    // for each owner
    for (const [ownerIdx, ownerInput] of input.owners.entries()) {
      const contexts = contextsByOwner.get(ownerInput)!;
      const { owner, ownerLabel, contextKeyrack, contextGet } = contexts;
      const isLastOwner = ownerIdx === input.owners.length - 1;
      const ownerPrefix = isLastOwner ? '└─' : '├─';
      const branchContinue = isLastOwner ? '   ' : '│  ';
      (context.emit ?? console.log)(
        `   ${ownerPrefix} for owner ${ownerLabel}`,
      );

      const ownerFlag = ` --owner ${ownerLabel}`;
      const prikeyFlag =
        input.prikeys.length > 0
          ? input.prikeys.map((p) => ` --prikey ${p}`).join('')
          : '';

      // infer vault if not prescribed; mech inferred by vault adapter
      const keySpec = repoManifest.keys[slug];
      const vaultInferred = inferKeyrackVaultFromKey({ keyName });
      const vault = vaultInferred ?? 'os.secure';
      const mech = keySpec?.mech ?? null; // vault adapter handles inference

      // the reaches to provision for this key
      const targets = getAllKeyrackFillTargets({
        reaches: keySpec?.reaches ?? [],
      });

      for (const [targetIdx, target] of targets.entries()) {
        const isLastTarget = targetIdx === targets.length - 1;

        const branch = asKeyrackFillTargetBranch({
          target,
          isLast: isLastTarget,
          isLone: targets.length === 1,
          branchContinue,
        });
        const targetIndent = branch.indent;
        if (branch.header) (context.emit ?? console.log)(branch.header);

        const reachFlag = target.reach
          ? ` --reach ${asKeyrackKeyReachExid({ reach: target.reach })}`
          : '';

        // try unlock → get to check if key is already configured
        // .note = the unlock is a PROBE, not the work. it may miss (no vault file, no
        //         manifest entry, no key at this reach) and the daemon may still hold the
        //         key from a prior session — so a miss is absorbed and the daemon asked
        try {
          await unlockKeyrackKeys(
            { owner, env: input.env, key: keyName, reach: target.reach },
            contextKeyrack,
          );
        } catch (error) {
          // a miss is the probe's normal answer — the daemon is checked next, and the key
          // is set if neither holds it. a DEFECT is not a miss, and rethrows
          if (!isKeyrackFillProbeMiss({ error })) throw error;
        }

        // check if daemon has key (even if unlock failed — daemon may have it from prior session)
        const checkGrant = await getKeyrackKeyGrant(
          { for: { key: slug }, reach: target.reach },
          contextGet,
        );

        // handle blocked keys — fail-fast unless user opts in.
        // .note = flat guards, no else: --repair wins over --allow-dangerous, so each
        //         guard states the full condition it fires on and the reader never has
        //         to carry a branch in their head (rule.forbid.else-branches)
        const isBlocked = checkGrant.status === 'blocked';

        // --allow-dangerous: accept the blocked key as-is, move to the next target
        if (isBlocked && !input.repair && input.allowDangerous) {
          (context.emit ?? console.log)(
            `   ${targetIndent}└─ 🟡 found vaulted under ${checkGrant.slug} dangerously, allowed via --allow-dangerous`,
          );
          results.push({
            slug,
            owner: ownerInput,
            reach: target.reach,
            status: 'skipped',
          });
          continue;
        }

        // fail-fast: with neither opt-in, the human must choose
        if (isBlocked && !input.repair && !input.allowDangerous) {
          (context.emit ?? console.log)(
            `   ${targetIndent}├─ ✗ blocked (dangerous token detected)`,
          );
          (context.emit ?? console.log)(
            `   ${targetIndent}└─ hint: use --repair to overwrite or --allow-dangerous to accept as-is`,
          );
          // .note = `reach` and `resultsSoFar` ride the metadata for the same reason they ride
          //         the roundtrip halt: this loop is `keys × owners × reaches`, so a halt
          //         here discards the report for every target before it, and the slug alone
          //         names all of a key's reaches rather than the one that blocked
          //         (rule.require.failloud)
          throw new ConstraintError(
            `key ${keyName} is blocked (dangerous token detected)`,
            {
              slug,
              owner: ownerInput,
              reach: target.reach,
              resultsSoFarCount: results.length,
              resultsSoFar: results,
            },
          );
        }

        // --repair: overwrite the blocked key — falls through to the set below
        if (isBlocked)
          (context.emit ?? console.log)(
            `   ${targetIndent}├─ 🟡 blocked (dangerous), will repair`,
          );

        // skip if key is already granted (unless --refresh)
        if (checkGrant.status === 'granted' && !input.refresh) {
          (context.emit ?? console.log)(
            `   ${targetIndent}└─ 🟢 found vaulted under ${checkGrant.grant.slug}`,
          );
          results.push({
            slug,
            owner: ownerInput,
            reach: target.reach,
            status: 'skipped',
          });
          continue;
        }

        // emit "set the key" section with treebucket open
        (context.emit ?? console.log)(`   ${targetIndent}├─ set the key`);
        (context.emit ?? console.log)(`   ${targetIndent}│  ├─`);
        (context.emit ?? console.log)(`   ${targetIndent}│  │`);

        // set key (stdout prefixed for tree-format output)
        const bucketIndent = `   ${targetIndent}│  │  `;
        // ⚠️ .why the try = the treebucket is opened THREE lines up and closed six lines
        //         down, so a throw between them leaves the tree open forever — the render
        //         ends mid-branch and the error dumps flush-left, outside the structure it
        //         was meant to sit in. a human reads a truncated tree and a crash, with no
        //         visual tie between them
        // .note = this halt became reachable on EVERY declared reach when the `prefer`
        //         tier was cut (amendment 2026-08-05): a fumbled prompt used to render a
        //         tidy `🟡 skipped` line and carry on, and now it stops the run. the stop is
        //         right; its render was never designed for, and that is what this fixes
        // .note = re-throws untouched, so the exit code and the error's own identity are
        //         unchanged — this closes the BRACKET, never swallows the fault
        //         (`rule.forbid.failhide`). the turtle report is applied at the cli
        //         boundary, where every other keyrack command applies it
        try {
          await withStdoutPrefix(bucketIndent, async () => {
            await setKeyrackKey(
              {
                key: keyName,
                env: input.env,
                org: asKeyrackKeyOrg({ slug }),
                vault,
                mech,
                reach: target.reach,
                repoManifest,
              },
              contextKeyrack,
            );
          });
        } catch (error) {
          // close the treebucket so the tree stays intact up to the point of the halt
          (context.emit ?? console.log)(`   ${targetIndent}│  │`);
          (context.emit ?? console.log)(`   ${targetIndent}│  └─`);
          throw error;
        }

        // close treebucket
        (context.emit ?? console.log)(`   ${targetIndent}│  │`);
        (context.emit ?? console.log)(`   ${targetIndent}│  └─`);

        // emit "get after set, to verify" section
        (context.emit ?? console.log)(
          `   ${targetIndent}└─ get after set, to verify`,
        );

        // reload host manifest after set
        // .note = setKeyrackKey updated the host manifest on disk
        // .note = contextKeyrack.hostManifest has the OLD manifest (before set)
        // .note = we must reload to see the newly set key
        await daoKeyrackHostManifest.get({ owner }, contextKeyrack);

        // unlock key
        await unlockKeyrackKeys(
          { owner, env: input.env, key: keyName, reach: target.reach },
          contextKeyrack,
        );
        (context.emit ?? console.log)(
          `   ${targetIndent}   ├─ ✓ rhx keyrack unlock --key ${keyName} --env ${input.env}${ownerFlag}${prikeyFlag}${reachFlag}`,
        );

        // verify roundtrip via get
        const attempt = await getKeyrackKeyGrant(
          { for: { key: slug }, reach: target.reach },
          contextGet,
        );

        // fail-fast if roundtrip verification fails — this is a defect, not recoverable
        if (attempt.status !== 'granted')
          (context.emit ?? console.log)(
            `   ${targetIndent}   └─ ✗ rhx keyrack get --key ${keyName} --env ${input.env}${ownerFlag}${reachFlag}`,
          );
        assertKeyrackFillRoundtrip({
          attempt,
          keyName,
          slug,
          owner: ownerInput,
          reach: target.reach,
          resultsSoFar: results,
        });

        (context.emit ?? console.log)(
          `   ${targetIndent}   └─ ✓ rhx keyrack get --key ${keyName} --env ${input.env}${ownerFlag}${reachFlag}`,
        );
        results.push({
          slug,
          owner: ownerInput,
          reach: target.reach,
          status: 'set',
        });
      }
    }
  }

  // summary
  const summary = {
    set: results.filter((r) => r.status === 'set').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
  };

  // .note = both outcomes are verified — `set` provisioned the key, `skipped` found it
  //         already vaulted. every unverified target threw before it reached here
  const verified = summary.set + summary.skipped;

  const total = getOneKeyrackFillTargetCount({
    slugs,
    keys: repoManifest.keys,
    owners: input.owners,
  });
  (context.emit ?? console.log)('');
  (context.emit ?? console.log)(
    `🔐 keyrack fill complete (${verified}/${total} keys verified)`,
  );
  (context.emit ?? console.log)('');

  return { results, summary };
};
