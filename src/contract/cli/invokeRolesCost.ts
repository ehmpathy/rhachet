import type { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';

import type { BrainHookEvent } from '@src/domain.objects/BrainHookEvent';
import { asBootCostReadout } from '@src/domain.operations/boot/asBootCostReadout';
import { asBootCostSweepOwnershipLines } from '@src/domain.operations/boot/asBootCostSweepOwnershipLines';
import { asBootCostSweepReachLines } from '@src/domain.operations/boot/asBootCostSweepReachLines';
import { asBootCostSweepRow } from '@src/domain.operations/boot/asBootCostSweepRow';
import { asBootCostSweepSummary } from '@src/domain.operations/boot/asBootCostSweepSummary';
import { asBootSubjectFlagSuffix } from '@src/domain.operations/boot/asBootSubjectFlagSuffix';
import { asBootSweepOverBudgetReadout } from '@src/domain.operations/boot/asBootSweepOverBudgetReadout';
import type { BootSource } from '@src/domain.operations/boot/BootSource';
import { calcBootPayloadTokens } from '@src/domain.operations/boot/calcBootPayloadTokens';
import { genBootPayload } from '@src/domain.operations/boot/genBootPayload';
import { genOneRepoThisBootBudgetVerdict } from '@src/domain.operations/boot/genOneRepoThisBootBudgetVerdict';
import { getAllCostRows } from '@src/domain.operations/boot/getAllCostRows';
import type { BootSpecCost } from '@src/domain.operations/boot/getAllRepoBootSpecCosts';
import { getAllRepoBootSpecCosts } from '@src/domain.operations/boot/getAllRepoBootSpecCosts';
import { getAllSpecsOverBudget } from '@src/domain.operations/boot/getAllSpecsOverBudget';
import { getOneBootSource } from '@src/domain.operations/boot/getOneBootSource';
import { getOneBrainTokenCounter } from '@src/domain.operations/brainCost/getOneBrainTokenCounter';
import { getOneTokensColumnWidth } from '@src/utils/getOneTokensColumnWidth';

import { relative } from 'node:path';
import { asFlagList } from './asFlagList';
import { asSubjectFlagValues } from './asSubjectFlagValues';
import {
  FLAGS_PER_PAYLOAD,
  getAllFlagsRefusedBesideAll,
} from './getAllFlagsRefusedBesideAll';
import { getAllSubjectSlugs } from './getAllSubjectSlugs';
import { getOneBootSourceRequest } from './getOneBootSourceRequest';
import { getOneRankLimit } from './getOneRankLimit';

/**
 * .what = the boot source a cost report measures — a role default, or a declared manifest
 * .why = it calls the boot's own source request, so a cost report accepts exactly the
 *        coordinates a boot accepts and measures only a payload a boot can emit
 */
const getOneBootSourceForCost = (input: {
  opts: {
    repo?: string;
    role?: string;
    what?: string;
    ifPresent?: boolean;
  };
}): BootSource | null => {
  const request = getOneBootSourceRequest({ opts: input.opts });
  if (!request) return null;

  return getOneBootSource({ ...request, cwd: process.cwd() });
};

/**
 * .what = the hook callers `--when` accepts — `hook.` plus each declared brain hook event
 * .why = a typo'd caller must refuse loud, never fall back to the hand-run voice
 *        (`rule.require.when-names-the-caller`)
 * .note = keyed by every `BrainHookEvent`, so a new event that goes undeclared here fails the
 *         type check rather than silently narrows the accepted callers
 */
const WHEN_HOOK_BY_EVENT: { [K in BrainHookEvent]: `hook.${K}` } = {
  onBoot: 'hook.onBoot',
  onTool: 'hook.onTool',
  onStop: 'hook.onStop',
  onTalk: 'hook.onTalk',
};
const WHEN_HOOK_VALUES: readonly string[] = Object.values(WHEN_HOOK_BY_EVENT);

/**
 * .what = whether a `--when` value names a declared hook caller
 * .why = names the membership check, so the guard reads as intent rather than a cast
 */
const isHookWhenValue = (input: { value: string }): boolean =>
  WHEN_HOOK_VALUES.includes(input.value);

/**
 * .what = the hook arm — this repo's own `.agent/repo=.this` boots, checked against their cap
 * .why = a repo's own role boots grow with no upkeep, and a stop hook is the one moment
 *        every session passes through. so the hook holds the stop the moment an owned spec
 *        exceeds its cap, and says naught otherwise
 *
 * 🔴 .note = it sweeps `.agent/repo=.this/role=*` ALONE. a linked role is its supplier's to
 *   cap (`rule.forbid.framework-owned-hooks`).
 *
 * .note = silent within budget, so the hook prints only when a human must act
 */
const invokeRolesCostForHook = async (): Promise<void> => {
  const cwd = process.cwd();
  const { over } = await genOneRepoThisBootBudgetVerdict({ cwd });
  if (over.length === 0) return;

  // the readout is the human surface; the error carries the same facts for a caller to branch on
  console.error(
    asBootSweepOverBudgetReadout({
      invocation: 'roles cost --all --when hook.onStop',
      over,
      cwd,
    }).join('\n'),
  );
  throw new ConstraintError('boot specs exceed their declared budget', {
    hint: 'trim a resource — catalogize a set, condense or ref a say entry, list one under `not` — or raise budget.tokens deliberately',
    // `specsOver`, never `over` — the boot halt's `over` is a token COUNT, and one key name
    // across the two refusals must hold one type
    specsOver: over.map((one) => relative(cwd, one.pathToSpec)),
  });
};

/**
 * .what = the token count of each spec in a sweep roster, in roster order
 * .why = the tokens column width is a property of the roster, so it reads these counts
 */
const getAllTokensOfCosts = (input: { costs: BootSpecCost[] }): number[] =>
  input.costs.map((one) => one.tokens);

/**
 * .what = the repo-wide arm — every boot spec this repo can reach, costed
 * .why = it answers the same question `roles cost` answers per spec, over the whole repo. a
 *        human who wants to know where their context budget goes asks it once, of every spec.
 *
 * 🔴 .note = it REPORTS, and never refuses — an over-budget spec is a marked row, and the arm
 *   exits 0 (requirement 9: a report a human typed answers, it does not gate). the refusal for
 *   this repo's own `.agent/repo=.this` boots is the hook arm's (`--when hook.onStop`).
 *
 * ⚠️ .note = a `(linked)` row is tagged, since its budget is another repo's to raise — the same
 *   ownership split the budget gate draws (requirement 8).
 */
const invokeRolesCostForAll = async (): Promise<void> => {
  const cwd = process.cwd();
  const { costs, globs } = await getAllRepoBootSpecCosts({ cwd, globs: null });

  // 🔴 the reach prints on BOTH arms, and the empty one is where it earns its lines: the sweep
  //    walks a glob POLICY rather than the whole repo, so *"none found"* is a claim
  //    about four paths that a reader would otherwise read as a claim about their repo
  const linesReach = asBootCostSweepReachLines({ globs });

  const over = getAllSpecsOverBudget({ costs });
  if (costs.length === 0) {
    console.log(asBootCostSweepSummary({ costs, over }));
    linesReach.forEach((line) => console.log(line));
    return;
  }

  console.log(asBootCostSweepSummary({ costs, over }));

  // the width is a property of the ROSTER, never of a row, so it is computed once here and
  // handed down — the same shape `asBootCostReadout` and `asBootSubjectMarginLines` use
  const widthTokens = getOneTokensColumnWidth({
    counts: getAllTokensOfCosts({ costs }),
  });
  costs.forEach((one) =>
    console.log(asBootCostSweepRow({ one, cwd, widthTokens })),
  );
  linesReach.forEach((line) => console.log(line));

  // 🔴 the ownership note follows the reach, because both are DISCLOSURES about the roster
  //    rather than rows of it — the reach bounds which specs were seen, this one bounds which
  //    of them the reader can act on. it prints naught where no spec is linked
  asBootCostSweepOwnershipLines({ costs }).forEach((line) => console.log(line));
};

/**
 * .what = adds the "roles cost" subcommand to the CLI
 * .why = answers "what does this boot cost, and where does it go?" — for the payload the
 *        boot ACTUALLY emits, counted the way the budget gate counts it
 *
 * 🔴 .note = it reads the boot payload rather than the role DIRECTORY. a walk of the role dir
 *   would cost every file at full content, so it would name files a `ref` never resides and
 *   miss every line of roster and chrome the payload does emit. `roles cost` and `roles boot`
 *   read one render and one counter, so their totals are equal by construction.
 *
 * 🔴 .note = `--all` is an ARM of this command rather than a command of its own. `budget`
 *   names a LIMIT, where the sweep renders a REPORT — and a human who types `roles cost` and
 *   a human who types `roles budget` ask one question, so they get one command.
 */
export const invokeRolesCost = ({ command }: { command: Command }): void => {
  command
    .command('cost')
    .description('show what a boot costs, and where the tokens go')
    .option('--repo <slug>', 'the repository slug for the role')
    .option('--role <slug>', 'the role to cost')
    // two flags, one option — `--what` primary, `--manifest` a live alias. the boot's own
    // contract, verbatim, so a caller who learns one command has learned the other
    .option(
      '--manifest, --what <path>',
      'cost a declared boot.yml instead of a role',
    )
    .option(
      '--subject <slugs>',
      'cost specific subjects (comma-separated or repeated, subject mode only)',
      asSubjectFlagValues,
    )
    // the value constraint rides in the help text, so a caller learns it before a refusal
    // rather than through one (`rule.require.help-on-demand`)
    .option(
      '--top <count>',
      'how many batches to rank — a non-negative integer (default: 10)',
    )
    .option('--all', 'cost every boot spec in this repo, as a roster')
    .option('--if-present', 'exit silently where the role dir is absent')
    .option(
      '--when <caller>',
      `who invoked this, with --all — one of ${WHEN_HOOK_VALUES.join(', ')}`,
    )
    .action(
      async (opts: {
        repo?: string;
        role?: string;
        what?: string;
        subject?: string[];
        top?: string;
        all?: boolean;
        ifPresent?: boolean;
        when?: string;
      }) => {
        // a caller that names itself must name a declared hook event, and only the sweep
        // has a hook arm — refuse loud rather than fall back to the hand-run voice
        if (opts.when !== undefined) {
          if (!isHookWhenValue({ value: opts.when }))
            ConstraintError.throw(
              `--when must be one of ${WHEN_HOOK_VALUES.join(', ')}`,
              {
                when: opts.when,
                hint: 'pass a declared hook caller, or drop --when for a hand run',
              },
            );
          if (!opts.all)
            ConstraintError.throw('--when requires --all', {
              when: opts.when,
              hint: `run \`roles cost --all --when ${opts.when}\``,
            });
        }

        if (opts.all) {
          // the sweep picks its own sources and renders one ROW per spec, so it honors no
          // per-payload flag at all. refuse rather than consume one silently
          //
          const flagsRefused = getAllFlagsRefusedBesideAll({ opts });
          if (flagsRefused.length > 0)
            ConstraintError.throw(
              `--all cannot be used with ${asFlagList({ flags: FLAGS_PER_PAYLOAD })}`,
              {
                passed: flagsRefused,
                hint: 'run `roles cost --all` alone, or drop --all to cost one spec',
              },
            );
          // a hook caller gets the quiet `.this` check
          if (opts.when) return await invokeRolesCostForHook();

          // a human gets the full roster
          return await invokeRolesCostForAll();
        }

        // 🔴 the source contract is the BOOT's own, verbatim — that is what makes the two
        //    commands cost one payload rather than two that must be kept in agreement
        const sourceFound = getOneBootSourceForCost({ opts });
        if (!sourceFound) {
          console.log('🫧 role not present, skipped');
          return;
        }

        // 🔴 the header quotes the `--subject` slice it measured, exactly as the boot halt
        //    does. without it, a narrowed readout and the whole spec's readout head with one
        //    line, and a reader cannot tell which payload a number belongs to
        const subjects = getAllSubjectSlugs({ raw: opts.subject });
        const source: BootSource = {
          ...sourceFound,
          coordinates:
            sourceFound.coordinates + asBootSubjectFlagSuffix({ subjects }),
        };

        const payload = await genBootPayload({
          source,
          subjects: subjects ?? null,
        });
        if (!payload) {
          console.log(`🧢 roles cost ${source.coordinates}`);
          // .note = `🟡`, never `✋`. an empty universe is a LEGITIMATE state — a spec that
          //   curates no resource costs zero, which is a true answer rather than a refusal —
          //   and `✋` binds to `ConstraintError` and exit 2 by the pair law
          //   (`rule.require.unabridged-error-prefix`). the peer `bootRoleResources` renders
          //   this same pair, header and row, so one state reads one way on both commands
          console.log('   └─ 🟡 no resources found — this boot emits naught');
          return;
        }

        // the boundary is crossed ONCE, here, and the two counters below receive it —
        // each is a pure compute op (`getOneBrainTokenCounter`). the repo's token memo backs
        // it, so a repeat run over unchanged briefs never builds the encoder
        const countTokens = await getOneBrainTokenCounter({
          memo: { cwd: process.cwd() },
        });
        const counted = calcBootPayloadTokens({ of: payload }, { countTokens });
        const rows = getAllCostRows(
          { batches: payload.batches },
          { countTokens },
        );

        for (const line of asBootCostReadout({
          payload,
          counted,
          rows,
          source,
          limit: getOneRankLimit({ raw: opts.top, fallback: 10 }),
        }))
          console.log(line);
      },
    );
};
