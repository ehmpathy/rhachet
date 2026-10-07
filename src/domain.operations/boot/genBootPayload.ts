import { ConstraintError } from 'helpful-errors';

import type { BootBudget } from '@src/domain.objects/RoleBootSpec';
import { asBootPayloadBatches } from '@src/domain.operations/boot/asBootPayloadBatches';
import { asBootRemedyMode } from '@src/domain.operations/boot/asBootRemedyMode';
import { asBootStatsLines } from '@src/domain.operations/boot/asBootStatsLines';
import type { BootBatch } from '@src/domain.operations/boot/BootBatch';
import type { BootPayloadMeasurable } from '@src/domain.operations/boot/BootPayloadMeasurable';
import type { BootSource } from '@src/domain.operations/boot/BootSource';
import { calcBootSayChars } from '@src/domain.operations/boot/calcBootSayChars';
import { computeBootPlan } from '@src/domain.operations/boot/computeBootPlan';
import { getAllBootSayResources } from '@src/domain.operations/boot/getAllBootSayResources';
import { getAllBriefCandidateFiles } from '@src/domain.operations/boot/getAllBriefCandidateFiles';
import { getAllDeclaredSubjectSlugs } from '@src/domain.operations/boot/getAllDeclaredSubjectSlugs';
import { getAllFilesOncePerRealPath } from '@src/domain.operations/boot/getAllFilesOncePerRealPath';
import { getOneBootConfigForSource } from '@src/domain.operations/boot/getOneBootConfigForSource';
import { assertZeroOrphanMinifiedBriefs } from '@src/domain.operations/role/briefs/assertZeroOrphanMinifiedBriefs';
import {
  BOOT_WALK_DIRS_SKIPPED,
  BRIEF_DIR_BLOCKLIST,
} from '@src/domain.operations/role/briefs/constants';
import { getRoleBriefRefs } from '@src/domain.operations/role/briefs/getRoleBriefRefs';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

/**
 * .what = the payload one boot WOULD emit, assembled to a buffer and not emitted
 * .why = FOUR callers measure this payload and only one of them emits it — the two gates
 *        (`assertRegistryWithinBudget` at `repo introspect`, `bootRoleResources` at
 *        `roles boot`, which is the one that emits) and the two report arms (`roles cost`
 *        per spec, and its `--all` sweep). a caller that assembled its own copy would
 *        measure a different number than the boot it gates.
 *
 * 🔴 .note = the body and the stats block are returned SEPARATELY, and the gate counts BOTH.
 *   the split is what makes the self-reference tractable: the stats block reports the number
 *   the gate computes, so the gate renders it
 *   per candidate total and iterates to a fixed point (`calcBootPayloadTokens`). a single
 *   pre-joined string could not be re-rendered per pass.
 */
/**
 * .what = the subject sections a boot rendered, and how to re-measure without each one
 * .why = the halt names the subjects in scope and what a drop of each recovers, so the
 *        author can drop one — see `genPayloadWithout`.
 *
 * .note = null wherever a `--subject` narrow is not a move this caller can make: a simple-mode
 *   spec, or a subject-mode spec that declares no section.
 */
export interface BootPayloadSubjects {
  /**
   * the subject slugs this render included
   */
  inScope: string[];

  /**
   * 🔴 .what = re-assembles the payload with ONE subject dropped, for MEASUREMENT alone
   * .why = a per-subject SHARE cannot be attributed. `computeSubjectModePlan` dedupes across
   *        sections — the first to say a resource wins, and every later section that names it
   *        is demoted to ref or dropped — so a resource's cost lands wholly on whichever
   *        section happens to be enumerated first. an attributed share would therefore report
   *        a number that moves when a spec's key ORDER moves, and would overstate what a drop
   *        of that subject actually recovers (`rule.forbid.failhide` — an advisory that
   *        misstates its own effect).
   *
   *   ⇒ so the honest quantity is the MARGIN: re-plan without the subject, re-count, and
   *     report the difference. it answers the purpose clause literally — it IS what the author
   *     recovers if they drop that one.
   *
   * .note = the margins do NOT sum to the payload, and the render must not imply they do. a
   *   resource two subjects both say is recovered by neither alone, and `always:` plus the xml
   *   chrome survive every drop.
   */
  genPayloadWithout: (input: {
    slug: string;
  }) => Promise<BootPayloadMeasurable | null>;
}

export interface BootPayload extends BootPayloadMeasurable {
  /**
   * the same body, split by what each run of lines is FOR
   *
   * 🔴 .why = `roles cost` must answer "what does this boot cost, and where does it go?" —
   *   and a cost report that assembled its own view of the payload would report a number
   *   the boot never emits. so `linesBody` is DERIVED from these batches,
   *   which makes the two reports one render by construction rather than by discipline.
   *
   * .note = a ref roster is ONE batch, never one per path. the base is hoisted across the
   *   whole block, so no single path owns a separable share of it.
   */
  batches: BootBatch[];

  /**
   * the cap this spec declared, or null where it declared none
   */
  budget: BootBudget | null;

  /**
   * whether a `--subject` narrow is a remedy this caller can take
   *
   * .note = it is NOT the schema mode, though it borrows its two words. a spec with only
   *   `always:` validates as subject mode and declares no subject section, so the narrow
   *   rung would name a move that shrinks naught. `subject` here means "sections exist".
   */
  mode: 'simple' | 'subject';

  /**
   * the subject sections in scope, and how to re-measure without each — null where none apply
   */
  subjects: BootPayloadSubjects | null;
}

/**
 * .what = every file this payload touches — say and ref alike, readme included
 * .why = it is the set the `<stats>` `files` row counts, and it was a seven-segment inline
 *        spread a reader had to walk to learn which sets it unions
 *        (`rule.require.named-transformers`).
 *
 * 🔴 .note = the name makes ONE asymmetry legible that the inline spread hid: this set counts
 *   say AND ref together, while `calcBootSayChars` counts say ALONE. ⇒ an author who takes the
 *   halt's `reference` remedy — move a `say` entry to `ref` — sees the `files` row hold STILL,
 *   and reads it as "the edit did not take". the two quantities answer different questions and
 *   always did; what was absent was a name that said so at the site the reader meets first.
 *
 * .note = `also` is included. a resource under `also` is addressable from the payload, so it
 *   is a file this boot touches — the row counts reach, never residency.
 */
const getAllRelevantFiles = (input: {
  bootPlan: Awaited<ReturnType<typeof computeBootPlan>>;
  readmeFile: string | undefined;
}): string[] => {
  const { bootPlan } = input;
  return [
    // the readme is always say, and it is never named by a spec
    ...(input.readmeFile ? [input.readmeFile] : []),
    ...bootPlan.briefs.say.map((ref) => ref.pathToOriginal),
    ...bootPlan.briefs.ref.map((ref) => ref.pathToOriginal),
    ...bootPlan.skills.say,
    ...bootPlan.skills.ref,
    ...bootPlan.also.briefs.map((ref) => ref.pathToOriginal),
    ...bootPlan.also.skills,
  ];
};

/**
 * .what = the source's readme, if the walk found it
 * .why = names which walked file is THE readme, so the orchestrator reads as named steps
 */
const getOneReadmeFromFiles = (input: {
  allFiles: string[];
  pathToReadme: string;
}): string | undefined =>
  input.allFiles.find((file) => file === input.pathToReadme);

/**
 * .what = the walked files that sit under the source's skills dir
 * .why = names the skill set, so the orchestrator reads as named steps
 */
const getAllSkillFilesFromFiles = (input: {
  allFiles: string[];
  dirSkills: string;
}): string[] =>
  input.allFiles.filter((file) => file.startsWith(input.dirSkills));

/**
 * .what = assembles a boot's payload from its source, without emit
 * .why = requirement 2 demands the budget be measured BEFORE a byte is emitted, and
 *        requirement 9 demands the same measurement at two gates that emit naught at all.
 *
 * .note = returns null for exactly one case — a source whose universe holds no resource.
 *   the caller decides what that means: `roles boot` warns, a pre-publish gate skips.
 */
export const genBootPayload = async (input: {
  source: BootSource;

  // .note = null = no selection, so every subject boots; `[]` = an explicit empty selection
  subjects: string[] | null;
}): Promise<BootPayload | null> => {
  const { source, subjects } = input;

  // recursively read all files, then filter to readme, briefs, and skills
  //
  // 🔴 .note = the sort precedes the dedupe, and that order carries weight. the dedupe keeps
  //   the FIRST path per on-disk file, so an unsorted input would let the disk's enumeration
  //   order decide which alias a payload cites — a label that differs per machine, which no
  //   snapshot can pin.
  //
  // .note = the walk never enters `node_modules`, `.git`, or `dist` — trees no boot cites,
  //   whose size has no bound, and which a symlinked package graph can re-enter by many routes
  const allFiles = getAllFilesOncePerRealPath({
    files: [
      ...getAllFilesFromDir(
        { dir: source.rootDir },
        { skipDirNames: BOOT_WALK_DIRS_SKIPPED },
      ),
    ].sort(),
  });

  const readmeFile = getOneReadmeFromFiles({
    allFiles,
    pathToReadme: source.pathToReadme,
  });
  const skillFiles = getAllSkillFilesFromFiles({
    allFiles,
    dirSkills: source.dirSkills,
  });

  // the brief candidate universe: a `briefs/` subdir, or every neighbor of the spec
  const briefFilesRaw = getAllBriefCandidateFiles({
    allFiles,
    source,
    blocklist: BRIEF_DIR_BLOCKLIST,
  });

  // prefer .md.min content and detect orphans
  const { refs: briefRefs, orphans } = getRoleBriefRefs({
    briefFiles: briefFilesRaw,
    briefsDir: source.dirBriefs ?? source.rootDir,
  });
  assertZeroOrphanMinifiedBriefs({ orphans });

  // load and parse the boot spec if present (a computed spec may be absent; a declared one
  //   may not — `getOneBootConfigForSource` owns that split)
  const bootConfig = getOneBootConfigForSource({ source });

  // the declared cap, or null
  const budget = bootConfig?.budget ?? null;

  // validate: --subject requires subject mode
  if (subjects && subjects.length > 0) {
    if (!bootConfig || bootConfig.mode !== 'subject') {
      throw new ConstraintError('--subject requires boot.yml in subject mode', {
        subjects,
        mode: bootConfig?.mode ?? 'none',
      });
    }
  }

  // compute which resources to say vs ref
  const bootPlan = await computeBootPlan({
    config: bootConfig,
    briefRefs,
    skillPaths: skillFiles,
    cwd: source.rootDir,
    subjects: subjects ?? undefined,
  });

  const relevantFiles = getAllRelevantFiles({ bootPlan, readmeFile });

  // an empty universe: the caller decides what that means
  if (relevantFiles.length === 0) return null;

  // 🔴 the ONE read of say content in this operation. every say resource is read here, once,
  //    and both consumers below — the `<stats>` char row and the rendered body — draw from
  //    this set rather than from the filesystem.
  const resourcesSay = getAllBootSayResources({
    pathToReadme: readmeFile ?? null,
    briefsSay: bootPlan.briefs.say,
    skillsSay: bootPlan.skills.say,
  });

  // only say resources carry chars; a ref emits its path and never its content
  const totalChars = calcBootSayChars({ resources: resourcesSay });

  // the stats block (emitted twice — once as a header, once as a footer). the caller supplies
  //   `counted` once the gate has measured the render, so the closure binds all else here
  const quant = {
    files: relevantFiles.length,
    briefs: {
      say: bootPlan.briefs.say.length,
      ref: bootPlan.briefs.ref.length,
    },
    skills: {
      say: bootPlan.skills.say.length,
      ref: bootPlan.skills.ref.length,
    },
  };
  const genStatsLines = (statsInput: {
    counted: { tokens: number } | null;
  }): string[] =>
    asBootStatsLines({
      quant,
      chars: totalChars,
      budget,
      counted: statsInput.counted,
    });

  // assemble the BODY to a buffer rather than stream it
  //
  // .why = the budget gate must measure the whole payload BEFORE a byte of it is emitted —
  //        a halt that first prints the payload has already spent the tokens it refuses to
  //        authorize (requirement 2). so the body is built, measured, then flushed or dropped.
  const batches = asBootPayloadBatches({
    resourcesSay,
    bootPlan,
    label: source.label,
  });

  // 🔴 DERIVED, never assembled beside the batches
  //
  // .why = `roles cost` ranks the batches and `roles boot` emits this body. were the two
  //   built independently, a cost report could rank a payload the boot does not emit.
  //   one flatten makes them the same render by construction.
  const linesBody: string[] = batches.flatMap((batch) => batch.lines);

  /**
   * .what = the subject roster the halt names, and the closure that prices each drop
   * .why = the halt names WHICH subjects were in scope and what a drop of each recovers,
   *        so the author can drop one. `BootPayloadSubjects` carries why the price is a
   *        MARGIN rather than an attributed share.
   *
   * .note = it is gated on the REMEDY mode, so the roster exists exactly where the `narrow`
   *   rung does. an `always:`-only spec carries neither.
   */
  const getOneSubjectRoster = (): BootPayloadSubjects | null => {
    if (asBootRemedyMode({ spec: bootConfig }) !== 'subject') return null;

    // what THIS render included: the caller's selection, or every section the spec declares
    const inScope = subjects?.length
      ? subjects
      : getAllDeclaredSubjectSlugs({ spec: bootConfig });

    return {
      inScope,
      genPayloadWithout: async (drop) =>
        await genBootPayload({
          source,
          // ⚠️ `[]` is NOT read as "no selection" downstream — `computeBootPlan` takes
          //   `input.subjects ?? every slug`, and `[] ?? x` is `[]`. so a roster of one
          //   prices its drop as the always-only payload, which is the truth
          subjects: inScope.filter((slug) => slug !== drop.slug),
        }),
    };
  };

  return {
    linesBody,
    batches,
    budget,

    // the remedy mode — whether `narrow` names a move the caller can take.
    // deliberately NOT the schema's own `mode`; `asBootRemedyMode` carries why
    mode: asBootRemedyMode({ spec: bootConfig }),

    subjects: getOneSubjectRoster(),

    genStatsLines,
  };
};
