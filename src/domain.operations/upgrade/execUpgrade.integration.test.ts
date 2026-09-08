import { given, then, useBeforeAll, when } from 'test-fns';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the repo root, from this file
 * .why  = the two manifests this clamp reads are repo-relative, never cwd-relative — a
 *   jest run's cwd is the root today and that is a convention, never a guarantee
 */
const REPO_ROOT = join(__dirname, '../../..');

/**
 * .what = the `optionalDependencies` set `execUpgrade`'s `lifecycleHooks: 'skip'` was
 *   weighed against, pinned by NAME
 *
 * 🚨 .why a pin rather than a survey = `execUpgrade` opts every local upgrade out of
 *   dependency lifecycle hooks, and its note beside that call weighs the opt-out per
 *   dependency class. that note is TRUE of the set below and says naught about a member
 *   added after it was written. so a new optional dependency would inherit an opt-out
 *   nobody re-weighed for it, with no test to redden — this row is that test.
 *
 * ⚠️ .the VERSION axis is clamped elsewhere and deliberately not repeated here.
 *   `getPtyModuleOrNull.consumer.integration.test.ts` reads the declared node-pty version
 *   off this same manifest and installs it, so a downgrade reddens `[case2]` and `[case7]`
 *   there. this row owns MEMBERSHIP alone (`rule.forbid.revision-accretion-in-deliverables`).
 *
 * ⇒ when this reddens, the repair is never to edit the array. it is to read
 *   `execUpgrade.ts`'s note beside `lifecycleHooks: 'skip'`, decide whether the opt-out
 *   holds for the new member, and THEN record the decision here.
 */
const OPTIONAL_DEPS_DECLARED_EXPECTED = ['node-pty'] as const;

/**
 * .what = the lifecycle-hook field names npm runs on a DEPENDENCY install
 * .why  = named as data so a reader sees the whole surface at once, rather than three
 *   string literals buried in a predicate
 *
 * ⚠️ these are npm's own field names, so they carry npm's word rather than ours
 *   (`rule.forbid.term-script`). every sentence in this file says "lifecycle hook".
 */
const NPM_DEPENDENCY_INSTALL_HOOKS = [
  'preinstall',
  'install',
  'postinstall',
] as const;

/**
 * .what = each optional dependency whose install hook is KNOWN to be a no-op once its
 *   prebuild ships, with the clamp that proves it
 *
 * 🚨 .why an allowlist rather than "no member declares a hook" = node-pty DOES declare
 *   one (`install` and `postinstall`, measured at 1.2.0-beta.15). a flat "no hooks"
 *   assertion would go red today against a dependency whose hook is real and harmless,
 *   so it would be deleted within a round. the checkable claim is narrower and true:
 *   **a declared hook must be ACCOUNTED FOR, by name, with its proof cited.**
 *
 * ⚠️ .the entry is a claim, not an exemption. the value is the artifact that settles it —
 *   a member added here with no citation has been waved past rather than proven.
 */
const OPTIONAL_DEP_HOOKS_ACCOUNTED_FOR: Record<string, string> = {
  'node-pty':
    'its hook only CHECKS for a prebuild and exits 0 when one is present — proven by `[case7]` in getPtyModuleOrNull.consumer.integration.test.ts, which installs the declared version with the same opt-out `execUpgrade` passes and then loads the addon and spawns a real pty',
};

/**
 * .what = what one optional dependency's INSTALLED manifest says about its install hooks
 *
 * 🚨 .a KIND, not a nullable list — `absent` and `no-hook` are different facts and only
 *   one of them is a property of the dependency. an optional dependency legitimately goes
 *   uninstalled on a platform it does not support, and to fold that into "declares no
 *   hook" would let an unsupported host report a clean survey it never took
 *   (`rule.forbid.failhide`).
 */
type OptionalDepHookRead =
  | { kind: 'absent'; name: string }
  | { kind: 'no-hook'; name: string }
  | { kind: 'declares-hook'; name: string; hooks: string[] };

/**
 * .what = read one optional dependency's installed manifest and classify its install hooks
 * .why  = the DECLARED manifest says which dependency we opted out for; only the INSTALLED
 *   manifest says whether that dependency actually has a hook to opt out of
 */
const getOptionalDepHookRead = (input: {
  name: string;
}): OptionalDepHookRead => {
  const manifestPath = join(
    REPO_ROOT,
    'node_modules',
    input.name,
    'package.json',
  );

  const manifestRaw = ((): string | null => {
    try {
      return readFileSync(manifestPath, 'utf8');
    } catch (error) {
      // 🚨 ENOENT alone reads as `absent`. any other errno is a real fault and is
      //   re-thrown — a permission fault must never be reported as an uninstalled
      //   dependency (`rule.forbid.failhide`)
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return null;
    }
  })();
  if (manifestRaw === null) return { kind: 'absent', name: input.name };

  const manifest = JSON.parse(manifestRaw) as {
    scripts?: Record<string, string>;
  };
  const hooks = NPM_DEPENDENCY_INSTALL_HOOKS.filter(
    (hook) => manifest.scripts?.[hook] !== undefined,
  );

  if (hooks.length === 0) return { kind: 'no-hook', name: input.name };
  return { kind: 'declares-hook', name: input.name, hooks: [...hooks] };
};

/**
 * .what = the names declared under `optionalDependencies` in this repo's own manifest
 */
const getOptionalDepsDeclared = (): string[] => {
  const manifest = JSON.parse(
    readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'),
  ) as { optionalDependencies?: Record<string, string> };
  return Object.keys(manifest.optionalDependencies ?? {});
};

describe('execUpgrade — the scope its lifecycle-hook opt-out rests on', () => {
  given(
    '[case1] 🚨 the TRIP-WIRE — `optionalDependencies` as this round weighed it',
    () => {
      const scene = useBeforeAll(async () => ({
        declared: getOptionalDepsDeclared(),
      }));

      when('[t0] the declared set is enumerated', () => {
        then('it is exactly the set the opt-out was weighed against', () => {
          // ⚠️ sorted on both sides so a manifest reorder is not a red row — the claim
          //   is about MEMBERSHIP, and key order carries no meaning in json
          expect([...scene.declared].sort()).toEqual(
            [...OPTIONAL_DEPS_DECLARED_EXPECTED].sort(),
          );
        });
      });
    },
  );

  given(
    '[case2] 🚨 every declared member with an install hook is ACCOUNTED FOR',
    () => {
      const scene = useBeforeAll(async () => ({
        reads: getOptionalDepsDeclared().map((name) =>
          getOptionalDepHookRead({ name }),
        ),
      }));

      when('[t0] each installed manifest is read', () => {
        then(
          'no member declares an install hook without a cited proof it is a no-op',
          () => {
            const unaccounted = scene.reads
              .filter(
                (
                  read,
                ): read is Extract<
                  OptionalDepHookRead,
                  { kind: 'declares-hook' }
                > => read.kind === 'declares-hook',
              )
              .filter(
                (read) =>
                  OPTIONAL_DEP_HOOKS_ACCOUNTED_FOR[read.name] === undefined,
              )
              .map((read) => `${read.name} (${read.hooks.join(', ')})`);

            // ⚠️ the assertion is on the LIST, never on its length — a red row then
            //   names the dependency and the hook a reader must go weigh, rather than
            //   reporting `1 !== 0`
            expect(unaccounted).toEqual([]);
          },
        );

        then(
          'node-pty is READ as hook-declaring, so the row above is exercised rather than vacuous',
          () => {
            // 🚨 without this, `[case2]` would stay green on a host where node-pty is
            //   uninstalled — an empty survey and a clean survey are indistinguishable
            //   from the assertion above alone. this row is what gives it teeth on the
            //   platforms we support (`rule.require.clamp-edge-cases`)
            const read = scene.reads.find((one) => one.name === 'node-pty');
            expect(read?.kind).toEqual('declares-hook');
          },
        );
      });
    },
  );
});
