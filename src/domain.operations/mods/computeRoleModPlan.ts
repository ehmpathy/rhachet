import { distance } from 'fastest-levenshtein';
import picomatch from 'picomatch';

import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';
import { RoleModPlan } from '@src/domain.objects/RoleModPlan';
import type { RoleModSpec } from '@src/domain.objects/RoleModSpec';
import { getAllRoleBootSpecGlobs } from '@src/domain.operations/role/getAllRoleBootSpecGlobs';

import { asBriefPathLessMin } from './asBriefPathLessMin';
import { asRoleModRefusalError } from './asRoleModRefusalError';
import { asRoleResourceKind as asResourceKind } from './asRoleResourceKind';
import { isRoleModFileLitter } from './isRoleModFileLitter';

type ResourceKind = NonNullable<ReturnType<typeof asResourceKind>>;

/**
 * .what = every glob one key (say, ref, or not) declares for one kind, across every section
 * .why = a mod's say/ref globs mark additions and its not globs mark removals, whatever
 *        section declares them; the walk is the boot plan's own, so the two read alike
 */
const getAllSpecGlobs = (input: {
  sections: RoleBootSpec | null;
  kind: ResourceKind;
  key: 'say' | 'ref' | 'not';
}): string[] =>
  getAllRoleBootSpecGlobs({
    spec: input.sections,
    kind: input.kind,
    key: input.key,
  });

/**
 * .what = the matcher of a glob or a glob set, dotfiles included
 * .why = one matcher for the add, not, and overlap checks, so all three match the same paths
 */
const asGlobMatcher = (input: {
  globs: string | string[];
}): ((path: string) => boolean) => picomatch(input.globs, { dot: true });

/**
 * .what = the most edits a held path may sit from a given path and still be offered
 * .why = a typo is one to three edits; a path further off is a different file, never a near miss
 */
const NEAREST_PATH_EDITS_MAX = 3;

/**
 * .what = the held path nearest a given path, for a "did you mean"
 * .why = a typo is the commonest cause of an unheld path, and its fix is the path it missed
 * .note = a path past the edit floor is withheld: a distant "did you mean" beside a fix that
 *         reads it as a typo would steer a human to shadow an unrelated file
 */
const getOneNearestPath = (input: {
  path: string;
  candidates: string[];
}): string | null =>
  input.candidates.reduce<{ path: string | null; score: number }>(
    (best, candidate) => {
      const score = distance(input.path, candidate);
      return score < best.score ? { path: candidate, score } : best;
    },
    { path: null, score: NEAREST_PATH_EDITS_MAX + 1 },
  ).path;

/**
 * .what = the out-of-scope refusal for a mod file outside briefs and skills
 * .why = a readme changes no behavior; an init or a hook writes actor config; a keyrack is a
 *        credential manifest. each is refused loud, never ignored (usecase 11)
 */
const asOutOfScopeRefusal = (input: { role: string; path: string }) =>
  asRoleModRefusalError({
    role: input.role,
    problem: `it holds ${input.path}, a kind a mod cannot change`,
    subject: input.path,
    nearest: null,
    fix: 'a mod holds only briefs/ and skills/ files; for a readme, an init, or a keyrack.yml, use a .this role or an upstream pr',
  });

/**
 * .what = every held path the mod's not globs remove, after a check of each glob
 * .why = a not that matches no held path is a typo, and one that removes a path the mod also
 *        shadows has no one answer; the notice and the view would disagree. either refuses
 */
const getAllRoleModPlanNots = (input: {
  role: string;
  spec: RoleModSpec;
  filesPublished: string[];
  modded: Set<string>;
}): Set<string> => {
  const globsByKind = (['briefs', 'skills'] as const).flatMap((kind) =>
    getAllSpecGlobs({ sections: input.spec.sections, kind, key: 'not' }).map(
      (glob) => ({ kind, glob }),
    ),
  );
  const matchedByGlob = globsByKind.map(({ kind, glob }) => {
    const filesOfKind = input.filesPublished.filter(
      (path) => asResourceKind({ path }) === kind,
    );
    const isMatch = asGlobMatcher({ globs: glob });
    const matched = filesOfKind.filter((path) => isMatch(path));
    if (matched.length === 0)
      throw asRoleModRefusalError({
        role: input.role,
        problem: `its not \`${glob}\` matches no ${kind} file the role holds`,
        subject: glob,
        nearest: getOneNearestPath({ path: glob, candidates: filesOfKind }),
        fix: 'point the not at a held path, or delete the line',
      });

    // a path the mod both shadows and nots has no one answer
    const overlap = matched.find((path) => input.modded.has(path));
    if (overlap)
      throw asRoleModRefusalError({
        role: input.role,
        problem: `its not \`${glob}\` removes ${overlap}, a path the mod also shadows`,
        subject: overlap,
        nearest: null,
        fix: `to shadow it, narrow the not so it leaves ${overlap}; to drop it, delete the mod file`,
      });
    return matched;
  });
  return new Set(matchedByGlob.flat());
};

/**
 * .what = refuse a mod whose add a not glob — its own, or the role's — would drop
 * .why = the role's not drops the add at the boot, and the mod's own not would contradict its
 *        own say; either way the notice would name an add the clone never reads
 */
const assertRoleModAddsSurviveNots = (input: {
  role: string;
  spec: RoleModSpec;
  specRole: RoleBootSpec | null;
  adds: string[];
}): void => {
  const sources = [
    { sections: input.spec.sections, owner: 'its' },
    { sections: input.specRole, owner: "the role's" },
  ] as const;
  for (const path of input.adds) {
    const kind = asResourceKind({ path });
    if (!kind) continue;
    const pathMatched = asBriefPathLessMin({ path });
    for (const source of sources) {
      const glob = getAllSpecGlobs({
        sections: source.sections,
        kind,
        key: 'not',
      }).find((not) => asGlobMatcher({ globs: not })(pathMatched));
      if (glob)
        throw asRoleModRefusalError({
          role: input.role,
          problem: `${source.owner} not \`${glob}\` removes ${path}, a path the mod adds`,
          subject: path,
          nearest: null,
          fix:
            source.owner === 'its'
              ? `to add it, narrow the not so it leaves ${path}; to drop it, delete the mod file`
              : `rename the add to a path the role's not leaves, or delete the mod file`,
        });
    }
  }
};

/**
 * .what = what a mod does to its role, per file — shadow, add, or not
 * .why = the plan is decided by the files and the mod's boot.yml alone, so it is pure; one
 *        plan feeds the view, the boot tags, the notice, the cost row and the pester
 *
 * .note = shadow = a mod file at a held path · add = a mod file at an unheld path that a mod
 *   say/ref glob names · not = each held path a mod not glob matches
 * .note = a `.md.min` at an unheld path rides with its `.md` (held or modded), so a mod that
 *   ships its own minification need not say it twice; one with no `.md` anywhere is an orphan
 * .note = a shadowed or not'd `.md` hides its published `.md.min` (`minsDropped`), or the boot
 *   would render the published minification in place of the mod
 */
export const computeRoleModPlan = (input: {
  spec: RoleModSpec;

  /**
   * the role's own boot.yml; null for a role with none
   */
  specRole: RoleBootSpec | null;
  filesPublished: string[];
  filesMod: string[];
}): RoleModPlan => {
  const role = input.spec.of.role;
  const published = new Set(input.filesPublished);
  const filesMod = input.filesMod.filter(
    (path) => !isRoleModFileLitter({ path }),
  );
  const modded = new Set(filesMod);

  // the matcher of every say/ref glob, per kind
  const asDeclaredMatcher = (kind: ResourceKind) =>
    asGlobMatcher({
      globs: (['say', 'ref'] as const).flatMap((key) =>
        getAllSpecGlobs({ sections: input.spec.sections, kind, key }),
      ),
    });
  const isDeclared = {
    briefs: asDeclaredMatcher('briefs'),
    skills: asDeclaredMatcher('skills'),
  };

  // sort each mod file into shadow or add, or refuse it
  // 🟡 .note = DELIBERATE MUTATION — shadows and adds grow across the walk, which a refusal may
  //   halt partway; the lists are local, and the walk reads a sorted copy, so both come out sorted
  const shadows: string[] = [];
  const adds: string[] = [];
  for (const path of [...filesMod].sort()) {
    const kind = asResourceKind({ path });
    if (!kind) throw asOutOfScopeRefusal({ role, path });

    // a held path is a shadow, whatever the spec says
    if (published.has(path)) {
      shadows.push(path);
      continue;
    }

    // a minification rides with its `.md`, wherever that lives
    if (path.endsWith('.md.min')) {
      const pathMd = asBriefPathLessMin({ path });
      if (published.has(pathMd) || modded.has(pathMd)) {
        adds.push(path);
        continue;
      }
      throw asRoleModRefusalError({
        role,
        problem: `it holds ${path}, a minified brief with no .md beside it`,
        subject: path,
        nearest: getOneNearestPath({ path, candidates: input.filesPublished }),
        fix: `add ${pathMd} beside it, or remove the orphan`,
      });
    }

    // an unheld path is an addition only where a say or ref glob names it
    if (isDeclared[kind](path)) {
      adds.push(path);
      continue;
    }
    const isSubjectMode =
      (input.spec.sections?.mode ?? input.specRole?.mode) === 'subject';
    const keySay = isSubjectMode ? `always.${kind}.say` : `${kind}.say`;
    throw asRoleModRefusalError({
      role,
      problem: `it holds ${path}, a path the role does not hold, and no say or ref names it`,
      subject: path,
      nearest: getOneNearestPath({ path, candidates: input.filesPublished }),
      fix: `to shadow, move it to the held path; to add, say it in the mod boot.yml (${keySay}: [${path}])`,
    });
  }

  // each not glob must remove a held path of its kind, and none the mod also shadows
  const nots = getAllRoleModPlanNots({
    role,
    spec: input.spec,
    filesPublished: input.filesPublished,
    modded,
  });

  // an add a not glob matches would never boot, so the mod is refused until it says which
  assertRoleModAddsSurviveNots({
    role,
    spec: input.spec,
    specRole: input.specRole,
    adds,
  });

  // a shadowed or not'd brief hides its published minification, unless the mod ships its own
  const minsDropped = [...shadows, ...nots]
    .filter((path) => path.endsWith('.md'))
    .map((path) => `${path}.min`)
    .filter((pathMin) => published.has(pathMin) && !modded.has(pathMin));

  return new RoleModPlan({
    shadows,
    adds,
    nots: [...nots].sort(),
    minsDropped: [...new Set(minsDropped)].sort(),
  });
};
