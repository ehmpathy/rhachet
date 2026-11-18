import { ConstraintError } from 'helpful-errors';

import {
  type ResourceCurationResolved,
  type RoleBootSpec,
  RoleBootSpecSimplified,
  type SubjectSectionResolved,
} from '@src/domain.objects/RoleBootSpec';
import type { RoleBriefRef } from '@src/domain.operations/role/briefs/getRoleBriefRefs';
import { getAllRoleBootSpecGlobs } from '@src/domain.operations/role/getAllRoleBootSpecGlobs';

import { filterByGlob } from './filterBootResourcesByGlob';
import { isAlwaysShed } from './isAlwaysShed';

/**
 * .what = the result of say vs ref computation for boot resources
 * .why = separates computation from output format
 *
 * .note = briefs use RoleBriefRef to preserve minified path resolution
 * .note = also section only populated in subject mode when all subjects booted
 */
export interface BootPlan {
  briefs: { say: RoleBriefRef[]; ref: RoleBriefRef[] };
  skills: { say: string[]; ref: string[] };
  also: { briefs: RoleBriefRef[]; skills: string[] };
}

/**
 * .what = the glob-match key of one boot resource
 * .why = briefs and skills are curated by the SAME algorithm and differ only here — a
 *        brief carries its match path beside a minified variant, a skill IS its path.
 *        every generic below takes one of these two, so the algorithm is written once
 *
 * .note = briefs match on pathToOriginal (the .md), never on the minified variant
 */
const getBriefKey = (ref: RoleBriefRef): string => ref.pathToOriginal;
const getSkillKey = (path: string): string => path;

/**
 * .what = partitions a resource list into say vs ref by one curation's globs
 * .why = the say-key semantics, written once for every resource kind
 *
 * .note = say-key semantics:
 *   - say: null → key was absent, say all resources
 *   - say: [] → key was present but empty, say none (all ref)
 *   - say: ['glob'] → say matched, ref unmatched
 */
const computeCurationPlan = async <T>(input: {
  curation: ResourceCurationResolved | null;
  items: T[];
  getKey: (item: T) => string;
  cwd: string;
}): Promise<{ say: T[]; ref: T[] }> => {
  // no curation = say all (backwards compat, key absent at resource level)
  if (!input.curation) return { say: input.items, ref: [] };

  // say: null means say key was absent -> say all
  if (input.curation.say === null) {
    // ref globs still apply if present
    if (input.curation.ref.length > 0) {
      const refMatched = await filterByGlob({
        items: input.items,
        globs: input.curation.ref,
        cwd: input.cwd,
        getMatchPath: input.getKey,
      });
      const refKeys = new Set(refMatched.map(input.getKey));
      return {
        say: input.items.filter((item) => !refKeys.has(input.getKey(item))),
        ref: refMatched,
      };
    }
    return { say: input.items, ref: [] };
  }

  // say: [] means say key was present but empty -> say none
  if (input.curation.say.length === 0) return { say: [], ref: input.items };

  // say: ['glob', ...] means say matched, ref unmatched
  const sayMatched = await filterByGlob({
    items: input.items,
    globs: input.curation.say,
    cwd: input.cwd,
    getMatchPath: input.getKey,
  });
  const sayKeys = new Set(sayMatched.map(input.getKey));
  return {
    say: sayMatched,
    ref: input.items.filter((item) => !sayKeys.has(input.getKey(item))),
  };
};

/**
 * .what = collects the resources one subject section explicitly claims
 * .why = in subject mode, only resources that match explicit globs are claimed
 *
 * .note = unlike computeCurationPlan (for simple mode), this does NOT treat
 *         unmatched resources as ref. only explicitly matched resources are returned.
 */
const collectSectionResources = async <T>(input: {
  curation: ResourceCurationResolved | null;
  items: T[];
  getKey: (item: T) => string;
  cwd: string;
}): Promise<{ say: T[]; ref: T[] }> => {
  if (!input.curation) return { say: [], ref: [] };

  // say globs: match and claim as say
  const say =
    input.curation.say && input.curation.say.length > 0
      ? await filterByGlob({
          items: input.items,
          globs: input.curation.say,
          cwd: input.cwd,
          getMatchPath: input.getKey,
        })
      : [];

  // ref globs: match and claim as ref (exclude already said)
  if (input.curation.ref.length === 0) return { say, ref: [] };

  const refMatched = await filterByGlob({
    items: input.items,
    globs: input.curation.ref,
    cwd: input.cwd,
    getMatchPath: input.getKey,
  });
  const sayKeys = new Set(say.map(input.getKey));
  return {
    say,
    ref: refMatched.filter((item) => !sayKeys.has(input.getKey(item))),
  };
};

/**
 * .what = accumulates say/ref for ONE resource kind across the always + subject sections
 * .why = the dedupe rule — say wins over ref, first occurrence says — is identical for
 *        briefs and skills, so it is written once rather than per kind
 *
 * .note = push ORDER is the contract: a render is snapshot-tested, so say and ref are
 *         appended in the order sections are processed, and within a section say before ref
 * .note = membership is tracked in Sets beside the lists, so a repeat is O(1) rather than
 *         a scan of the list built so far
 */
const genSectionAccumulator = <T>(input: { getKey: (item: T) => string }) => {
  const say: T[] = [];
  const ref: T[] = [];
  const saidKeys = new Set<string>();
  const refKeys = new Set<string>();
  const claimedKeys = new Set<string>();

  return {
    /** claim items a section says — a key already said falls to ref instead */
    addSay: (items: T[]): void => {
      for (const item of items) {
        const key = input.getKey(item);
        if (saidKeys.has(key)) {
          // already said by an earlier section, so this occurrence becomes a ref
          if (!refKeys.has(key)) {
            ref.push(item);
            refKeys.add(key);
          }
        } else {
          say.push(item);
          saidKeys.add(key);
        }
        claimedKeys.add(key);
      }
    },

    /** claim items a section refs — skipped where the key is already said or already ref */
    addRef: (items: T[]): void => {
      for (const item of items) {
        const key = input.getKey(item);
        if (!saidKeys.has(key) && !refKeys.has(key)) {
          ref.push(item);
          refKeys.add(key);
        }
        claimedKeys.add(key);
      }
    },

    /** every key any section claimed, said or ref — the complement is the `also` set */
    hasClaimed: (key: string): boolean => claimedKeys.has(key),

    result: (): { say: T[]; ref: T[] } => ({ say, ref }),
  };
};

/**
 * .what = computes which resources to say vs ref for simple mode
 * .why = handles top-level briefs/skills curation
 */
const computeSimpleModePlan = async (input: {
  config: RoleBootSpec & { mode: 'simple' };
  configMod: (RoleBootSpec & { mode: 'simple' }) | null;
  briefRefs: RoleBriefRef[];
  skillPaths: string[];
  cwd: string;
}): Promise<BootPlan> => {
  const briefsPlan = await computeCurationPlanWithMod({
    curation: input.config.briefs,
    curationMod: input.configMod?.briefs ?? null,
    items: input.briefRefs,
    getKey: getBriefKey,
    cwd: input.cwd,
  });

  const skillsPlan = await computeCurationPlanWithMod({
    curation: input.config.skills,
    curationMod: input.configMod?.skills ?? null,
    items: input.skillPaths,
    getKey: getSkillKey,
    cwd: input.cwd,
  });

  return {
    briefs: briefsPlan,
    skills: skillsPlan,
    also: { briefs: [], skills: [] },
  };
};

/**
 * .what = partitions one resource kind by a mod's curation first, then the role's
 * .why = the mod's sections are read before the role's (F9): what the mod says or refs
 *        is settled by the mod, and the role curates the rest as it does today
 *
 * .note = a mod's absent `say` claims naught — unlike a role's, where it means "say all".
 *   a mod states only what it changes
 * .note = each list keeps the universe order, so a promoted or demoted resource sits where
 *   the published role would have put it, and a render stays byte-stable
 */
const computeCurationPlanWithMod = async <T>(input: {
  curation: ResourceCurationResolved | null;
  curationMod: ResourceCurationResolved | null;
  items: T[];
  getKey: (item: T) => string;
  cwd: string;
}): Promise<{ say: T[]; ref: T[] }> => {
  // no mod curation: the role decides alone, exactly as today
  if (!input.curationMod)
    return computeCurationPlan({
      curation: input.curation,
      items: input.items,
      getKey: input.getKey,
      cwd: input.cwd,
    });

  // the mod claims first
  const claimedMod = await collectSectionResources({
    curation: input.curationMod,
    items: input.items,
    getKey: input.getKey,
    cwd: input.cwd,
  });
  const keysSayMod = new Set(claimedMod.say.map(input.getKey));
  const keysRefMod = new Set(claimedMod.ref.map(input.getKey));

  // the role curates what the mod left
  const planRole = await computeCurationPlan({
    curation: input.curation,
    items: input.items.filter(
      (item) =>
        !keysSayMod.has(input.getKey(item)) &&
        !keysRefMod.has(input.getKey(item)),
    ),
    getKey: input.getKey,
    cwd: input.cwd,
  });
  const keysSay = new Set([...keysSayMod, ...planRole.say.map(input.getKey)]);
  const keysRef = new Set([...keysRefMod, ...planRole.ref.map(input.getKey)]);

  return {
    say: input.items.filter((item) => keysSay.has(input.getKey(item))),
    ref: input.items.filter((item) => keysRef.has(input.getKey(item))),
  };
};

/**
 * .what = one section's claims, less each key a mod section already settled
 * .why = the mod's sections are read before the role's (F9); a role section that says a brief
 *        the mod refs must not render it a second time, as a say beside the mod's ref
 *
 * .note = a mod section's own claims pass through whole
 */
const asClaimsLessModKeys = <T>(input: {
  claimed: { say: T[]; ref: T[] };
  keysMod: ReadonlySet<string>;
  getKey: (item: T) => string;
  by: 'mod' | 'role';
}): { say: T[]; ref: T[] } => {
  // a mod's claims are kept whole
  if (input.by === 'mod') return input.claimed;

  // a role's claims skip each key a mod already settled
  const isFree = (item: T): boolean => !input.keysMod.has(input.getKey(item));
  return {
    say: input.claimed.say.filter(isFree),
    ref: input.claimed.ref.filter(isFree),
  };
};

/**
 * .what = computes which resources to say vs ref for subject mode
 * .why = handles always + subject.* curation with overlap dedupe
 *
 * .note = say wins over ref when both match the same resource
 *         first occurrence says, subsequent occurrences become ref
 */
const computeSubjectModePlan = async (input: {
  config: RoleBootSpec & { mode: 'subject' };
  configMod: (RoleBootSpec & { mode: 'subject' }) | null;
  briefRefs: RoleBriefRef[];
  skillPaths: string[];
  cwd: string;
  subjects?: string[];
}): Promise<BootPlan> => {
  const briefs = genSectionAccumulator<RoleBriefRef>({ getKey: getBriefKey });
  const skills = genSectionAccumulator<string>({ getKey: getSkillKey });

  // 🟡 .note = DELIBERATE MUTATION — the keys a mod section claimed, so the role's sections
  //   cannot claim them again (F9: what the mod says or refs is settled by the mod)
  const keysModBriefs = new Set<string>();
  const keysModSkills = new Set<string>();

  // absorb one section's claims into both accumulators, say before ref
  const absorbSection = async (
    section: SubjectSectionResolved | null,
    by: 'mod' | 'role',
  ): Promise<void> => {
    if (!section) return;

    const briefsClaimed = await collectSectionResources({
      curation: section.briefs,
      items: input.briefRefs,
      getKey: getBriefKey,
      cwd: input.cwd,
    });
    const skillsClaimed = await collectSectionResources({
      curation: section.skills,
      items: input.skillPaths,
      getKey: getSkillKey,
      cwd: input.cwd,
    });

    // a mod's claims are recorded; a role's claims skip what a mod already settled
    const briefsKept = asClaimsLessModKeys({
      claimed: briefsClaimed,
      keysMod: keysModBriefs,
      getKey: getBriefKey,
      by,
    });
    const skillsKept = asClaimsLessModKeys({
      claimed: skillsClaimed,
      keysMod: keysModSkills,
      getKey: getSkillKey,
      by,
    });

    briefs.addSay(briefsKept.say);
    skills.addSay(skillsKept.say);
    briefs.addRef(briefsKept.ref);
    skills.addRef(skillsKept.ref);

    // a mod's claims settle their keys for each role section after
    if (by !== 'mod') return;
    for (const item of [...briefsClaimed.say, ...briefsClaimed.ref])
      keysModBriefs.add(getBriefKey(item));
    for (const item of [...skillsClaimed.say, ...skillsClaimed.ref])
      keysModSkills.add(getSkillKey(item));
  };

  // determine which subjects to process
  const subjectSlugs = Object.keys(input.config.subjects);
  const selectedSlugs = input.subjects
    ? subjectSlugs.filter((slug) => input.subjects?.includes(slug))
    : subjectSlugs;

  // validate selected subjects exist
  if (input.subjects) {
    for (const slug of input.subjects) {
      if (!subjectSlugs.includes(slug)) {
        throw new ConstraintError(`subject not found: ${slug}`, {
          available: subjectSlugs,
          requested: input.subjects,
          hint: `pass --subject with one of: ${subjectSlugs.join(', ')}`,
        });
      }
    }
  }

  // process always section first, so its claims say before any subject's; it is shed only
  //   when a boot names its subjects and every one of them opts out. a mod's section is
  //   absorbed before its role's twin, so the mod's claim wins (F9)
  if (
    !isAlwaysShed({ config: input.config, subjects: input.subjects ?? null })
  ) {
    await absorbSection(input.configMod?.always ?? null, 'mod');
    await absorbSection(input.config.always, 'role');
  }

  // process each selected subject, in declaration order
  for (const slug of selectedSlugs) {
    await absorbSection(input.configMod?.subjects[slug] ?? null, 'mod');
    await absorbSection(input.config.subjects[slug] ?? null, 'role');
  }

  // compute also section (only when all subjects booted)
  const alsoBriefs = input.subjects
    ? []
    : input.briefRefs.filter((ref) => !briefs.hasClaimed(getBriefKey(ref)));
  const alsoSkills = input.subjects
    ? []
    : input.skillPaths.filter((path) => !skills.hasClaimed(getSkillKey(path)));

  return {
    briefs: briefs.result(),
    skills: skills.result(),
    also: { briefs: alsoBriefs, skills: alsoSkills },
  };
};

/**
 * .what = drops every resource a `not` glob claims, before the say/ref partition
 * .why = an exclusion subtracts from the universe rather than sorts within it, so an
 *        excluded resource is unreachable by say, ref, and `<also>` alike — `<also>`
 *        especially, since no say/ref glob governs it
 */
const getUniverseLessExclusions = async (input: {
  config: RoleBootSpec;
  briefRefs: RoleBriefRef[];
  skillPaths: string[];
  cwd: string;
}): Promise<{ briefRefs: RoleBriefRef[]; skillPaths: string[] }> => {
  // `not` excludes from the WHOLE payload, so every section's `not` counts
  const globs = {
    briefs: getAllRoleBootSpecGlobs({
      spec: input.config,
      kind: 'briefs',
      key: 'not',
    }),
    skills: getAllRoleBootSpecGlobs({
      spec: input.config,
      kind: 'skills',
      key: 'not',
    }),
  };

  // the common case excludes naught, so it costs no glob expansion
  if (!globs.briefs.length && !globs.skills.length)
    return { briefRefs: input.briefRefs, skillPaths: input.skillPaths };

  const dropBriefs = new Set(
    (
      await filterByGlob({
        items: input.briefRefs,
        globs: globs.briefs,
        cwd: input.cwd,
        getMatchPath: (ref) => ref.pathToOriginal,
      })
    ).map((r) => r.pathToOriginal),
  );
  const dropSkills = new Set(
    await filterByGlob({
      items: input.skillPaths,
      globs: globs.skills,
      cwd: input.cwd,
      getMatchPath: (path) => path,
    }),
  );

  return {
    briefRefs: input.briefRefs.filter((r) => !dropBriefs.has(r.pathToOriginal)),
    skillPaths: input.skillPaths.filter((p) => !dropSkills.has(p)),
  };
};

/**
 * .what = computes which resources to say vs ref
 * .why = centralizes the say/ref decision logic
 *
 * .note = briefRefs carry both pathToOriginal (for glob match) and pathToMinified (for content)
 */
export const computeBootPlan = async (input: {
  config: RoleBootSpec | null;

  /**
   * a mod's sections, read before the role's (F9); null for an unmodded role
   *
   * .note = its mode matches the role's, by `assertRoleModModeMatchesRole`; a role with no
   *   boot.yml says all, which is simple mode
   */
  configMod: RoleBootSpec | null;
  briefRefs: RoleBriefRef[];
  skillPaths: string[];
  cwd: string;
  subjects?: string[];
}): Promise<BootPlan> => {
  const configMod = input.configMod;

  // no config and no mod = say all, as a role with no boot.yml has always booted
  if (!input.config && !configMod) {
    return {
      briefs: { say: input.briefRefs, ref: [] },
      skills: { say: input.skillPaths, ref: [] },
      also: { briefs: [], skills: [] },
    };
  }

  // a role with no boot.yml says all, which is a simple spec with no curation
  const config: RoleBootSpec =
    input.config ??
    new RoleBootSpecSimplified({
      mode: 'simple',
      briefs: null,
      skills: null,
      budget: null,
    });

  // the role's exclusions; the mod's are the view's alone, since its view already omits each
  //   path the mod nots, and a second pass here would drop a mod add the view keeps
  const universe = await getUniverseLessExclusions({
    config,
    briefRefs: input.briefRefs,
    skillPaths: input.skillPaths,
    cwd: input.cwd,
  });

  if (config.mode === 'simple') {
    return computeSimpleModePlan({
      config,
      configMod: configMod?.mode === 'simple' ? configMod : null,
      briefRefs: universe.briefRefs,
      skillPaths: universe.skillPaths,
      cwd: input.cwd,
    });
  }

  // subject mode
  return computeSubjectModePlan({
    config,
    configMod: configMod?.mode === 'subject' ? configMod : null,
    briefRefs: universe.briefRefs,
    skillPaths: universe.skillPaths,
    cwd: input.cwd,
    subjects: input.subjects,
  });
};
