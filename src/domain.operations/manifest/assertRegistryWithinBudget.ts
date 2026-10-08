import { ConstraintError } from 'helpful-errors';

import type { RoleRegistry } from '@src/domain.objects';
import { assertBootWithinBudget } from '@src/domain.operations/boot/assertBootWithinBudget';
import { genBootPayload } from '@src/domain.operations/boot/genBootPayload';
import { getOneBootSource } from '@src/domain.operations/boot/getOneBootSource';
import { getOneDeclaredBudgetForSpec } from '@src/domain.operations/boot/getOneDeclaredBudgetForSpec';
import { isPathOutsideDir } from '@src/utils/isPathOutsideDir';

import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * .what = whether a role's declared spec sits on disk
 * .why = the one filesystem question this gate asks for itself, behind a name, so the loop
 *        reads as a decision (*"is there a spec to cap?"*) rather than as raw i/o
 *
 * .note = an absent spec is a legit state — a role may declare a `boot` uri its package
 *   never shipped — so it skips the role rather than refuses it
 */
const isBootSpecOnDisk = (input: { pathToSpec: string }): boolean =>
  existsSync(input.pathToSpec);

/**
 * .what = refuses a registry whose role declares a budget its own boot payload exceeds
 * .why = this is GATE 1 of the three `0.wish.md` requirement 9 names, and it is the only
 *        gate whose spec is writable by construction — a role package's `boot.yml` is a
 *        git-tracked regular file in the author's own tree, so every remedy the halt names
 *        points at a file they can open. the consumer-side gate can promise no such thing.
 *
 * .why = it sits in the build flow the author already runs (`npm run build` →
 *        `build:complete:repo` → `repo introspect` → `prepublish`), so no new command is
 *        owed and the refusal lands BEFORE publish rather than on a consumer.
 *
 * .note = the rung is always `halt` here, and that is not a constant that stands in for the
 *   computed one. a foreign spec cannot reach this gate at all — git does not track a
 *   symlink into `node_modules`, so every spec introspect sees is one the author wrote.
 *
 * .note = the loop halts on the first breach. `rhachet roles cost --all` lists every spec's
 *   cost, over budget or not.
 */
export const assertRegistryWithinBudget = async (input: {
  registry: RoleRegistry;

  /**
   * .what = the repo root every halt renders its spec path against
   * .why = the halt names a file the author must open, and a path is only pasteable where
   *        it is relative to the tree they stand in — see `getOneBootSourceFromRegistryRole`
   */
  dirRepo: string;
}): Promise<void> => {
  const { registry, dirRepo } = input;

  for (const role of registry.roles) {
    // a role with no declared spec declares no budget
    if (!role.boot) continue;

    const pathToSpec = role.boot.uri;
    if (!isBootSpecOnDisk({ pathToSpec })) continue;

    // peek at the declared cap before any filesystem walk
    //
    // .why = requirement 4's discipline, applied to this gate: a role that declares no
    //   budget pays no cost at all — no scan, no tokenizer load. the spec is parsed twice
    //   for a BUDGETED role, which is one small yaml read, and that is cheaper than a full
    //   resource walk for every role that declares none.
    //
    // .note = the read is classified — the `existsSync` above and this read are a
    //   check-then-read pair, and the window between them is a caller race rather than a
    //   malfunction (`readOneBootSpecFile`, reached through the shared peek).
    //
    // 🔴 .note = this gate is the peek's ONLY production caller. the `roles cost --all` sweep
    //   reads `payload.budget` off the render it already built — a REPORT renders every spec
    //   to state its cost, so a second parse would buy it naught. the two paths ask different
    //   questions: a gate asks *"may I skip the render?"*, a report asks *"what did the render
    //   cost?"*. the shared authority is `parseRoleBootYaml`, one layer down, which both reach.
    if (!getOneDeclaredBudgetForSpec({ pathToSpec })) continue;

    const dirRole = dirname(pathToSpec);

    // refuse a layout this gate cannot measure honestly
    //
    // .why = the gate scans `dirRole` and its `briefs/` + `skills/` subdirs, exactly as a
    //   consumer boot will once the package is linked. a role whose resources sit OUTSIDE
    //   that dir would be scanned short here, so the gate would pass a payload the consumer
    //   then exceeds — a silent mismeasure, which is the failure requirement 2 forbids.
    //   loud and actionable beats quietly wrong.
    assertRoleResourcesUnderDirRole({ role, dirRole });

    const source = getOneBootSource({
      from: {
        registryRole: {
          slugRepo: registry.slug,
          slugRole: role.slug,
          dirRole,
          dirRepo,
        },
      },
      ifPresent: false,
      cwd: dirRole,
    });
    if (!source) continue;

    const payload = await genBootPayload({ source, subjects: null });
    if (!payload) continue;

    // .note = the gated payload is the WHOLE render — body plus both stats blocks — and it
    //   is measured by the same operation gate 3 uses. that shared count is the point: a
    //   spec that clears introspect must clear a consumer's boot, so the two gates cannot be
    //   allowed to disagree on what the same spec costs.
    await assertBootWithinBudget({
      of: {
        linesBody: payload.linesBody,
        genStatsLines: payload.genStatsLines,
      },
      budget: payload.budget,
      rung: 'halt',
      invocation: source.invocation,
      mode: payload.mode,

      // the instrument beside the ladder, so the halted party can measure what to trim
      coordinates: source.coordinates,

      // the roster behind the ladder's `narrow` rung — priced only where the gate breaches
      subjects: payload.subjects,
    });
  }
};

/**
 * .what = every resource dir a role declares, whether it declared one or many
 * .why = `dirs` admits a single value or an array, and that shape decision is the registry's
 *        rather than this gate's. the fold belongs behind a name, so the gate reads as prose
 *        (`rule.require.named-transformers`)
 */
const getAllDirsDeclared = (input: {
  role: RoleRegistry['roles'][number];
}): { uri: string }[] => {
  const { role } = input;
  const asMany = <T>(dirs: T | T[]): T[] =>
    Array.isArray(dirs) ? dirs : [dirs];

  return [...asMany(role.briefs.dirs), ...asMany(role.skills.dirs)];
};

/**
 * .what = the declared resource dirs that escape the role's own dir
 * .why = the escape test is a path comparison with two arms, and inline it reads as a
 *        pipeline the caller must simulate
 *
 * .note = the escape test is `isPathOutsideDir`, shared with `getOneBootSourceFromManifest`;
 *   it holds the win32 cross-root case, where `relative` returns an absolute path
 */
const getAllDirsOutsideRole = (input: {
  role: RoleRegistry['roles'][number];
  dirRole: string;
}): string[] =>
  getAllDirsDeclared({ role: input.role })
    .map((dir) => dir.uri)
    .filter((uri) => isPathOutsideDir({ path: uri, dir: input.dirRole }));

/**
 * .what = refuses a budgeted role whose briefs or skills sit outside its own role dir
 * .why = see the call site — an off-dir resource is scanned short here and rendered by the
 *        consumer, so the gate would measure a payload smaller than the one that ships.
 *
 * .note = it fires only for a role that DECLARES a budget, so the set it can break today is
 *   empty: `budget` is a key this behavior introduces. a role with a split layout keeps
 *   working exactly as it does now, right up until the day it opts into a cap.
 */
const assertRoleResourcesUnderDirRole = (input: {
  role: RoleRegistry['roles'][number];
  dirRole: string;
}): void => {
  const { role, dirRole } = input;

  const dirsOffRole = getAllDirsOutsideRole({ role, dirRole });

  if (dirsOffRole.length === 0) return;

  throw new ConstraintError(
    'a budgeted role declares resources outside its own role dir',
    {
      role: role.slug,
      dirRole,
      dirsOffRole,
      why: 'the budget gate scans the role dir, so an off-dir resource would be measured short here and rendered in full by a consumer',
      hint: 'move the briefs/skills dirs beside boot.yml, or drop budget.tokens from that spec',
    },
  );
};
