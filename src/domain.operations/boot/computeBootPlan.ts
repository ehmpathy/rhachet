import { ConstraintError } from 'helpful-errors';

import type {
  ResourceCurationResolved,
  RoleBootSpec,
  SubjectSectionResolved,
} from '@src/domain.objects/RoleBootSpec';
import type { RoleBriefRef } from '@src/domain.operations/role/briefs/getRoleBriefRefs';

import { filterByGlob } from './filterBootResourcesByGlob';

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
  briefRefs: RoleBriefRef[];
  skillPaths: string[];
  cwd: string;
}): Promise<BootPlan> => {
  const briefsPlan = await computeCurationPlan({
    curation: input.config.briefs,
    items: input.briefRefs,
    getKey: getBriefKey,
    cwd: input.cwd,
  });

  const skillsPlan = await computeCurationPlan({
    curation: input.config.skills,
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
 * .what = computes which resources to say vs ref for subject mode
 * .why = handles always + subject.* curation with overlap dedupe
 *
 * .note = say wins over ref when both match the same resource
 *         first occurrence says, subsequent occurrences become ref
 */
const computeSubjectModePlan = async (input: {
  config: RoleBootSpec & { mode: 'subject' };
  briefRefs: RoleBriefRef[];
  skillPaths: string[];
  cwd: string;
  subjects?: string[];
}): Promise<BootPlan> => {
  const briefs = genSectionAccumulator<RoleBriefRef>({ getKey: getBriefKey });
  const skills = genSectionAccumulator<string>({ getKey: getSkillKey });

  // absorb one section's claims into both accumulators, say before ref
  const absorbSection = async (
    section: SubjectSectionResolved | null,
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

    briefs.addSay(briefsClaimed.say);
    skills.addSay(skillsClaimed.say);
    briefs.addRef(briefsClaimed.ref);
    skills.addRef(skillsClaimed.ref);
  };

  // process always section first, so its claims say before any subject's
  await absorbSection(input.config.always);

  // determine which subjects to process
  const subjectSlugs = Object.keys(input.config.subjects);
  const selectedSlugs = input.subjects ?? subjectSlugs;

  // validate selected subjects exist
  if (input.subjects) {
    for (const slug of input.subjects) {
      if (!subjectSlugs.includes(slug)) {
        throw new ConstraintError(`subject not found: ${slug}`, {
          available: subjectSlugs,
          requested: input.subjects,
        });
      }
    }
  }

  // process each selected subject, in declaration order
  for (const slug of selectedSlugs) {
    await absorbSection(input.config.subjects[slug] ?? null);
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
 * .what = computes which resources to say vs ref
 * .why = centralizes the say/ref decision logic
 *
 * .note = briefRefs carry both pathToOriginal (for glob match) and pathToMinified (for content)
 */
export const computeBootPlan = async (input: {
  config: RoleBootSpec | null;
  briefRefs: RoleBriefRef[];
  skillPaths: string[];
  cwd: string;
  subjects?: string[];
}): Promise<BootPlan> => {
  // no config = say all (backwards compat)
  if (!input.config) {
    return {
      briefs: { say: input.briefRefs, ref: [] },
      skills: { say: input.skillPaths, ref: [] },
      also: { briefs: [], skills: [] },
    };
  }

  if (input.config.mode === 'simple') {
    return computeSimpleModePlan({
      config: input.config,
      briefRefs: input.briefRefs,
      skillPaths: input.skillPaths,
      cwd: input.cwd,
    });
  }

  // subject mode
  return computeSubjectModePlan({
    config: input.config,
    briefRefs: input.briefRefs,
    skillPaths: input.skillPaths,
    cwd: input.cwd,
    subjects: input.subjects,
  });
};
