import { BadRequestError } from 'helpful-errors';

import type {
  ResourceCurationResolved,
  RoleBootSpec,
  SubjectSectionResolved,
} from '@src/domain.objects/RoleBootSpec';
import type { RoleBriefRef } from '@src/domain.operations/role/briefs/getRoleBriefRefs';

import { filterByGlob, filterPathsByGlob } from './filterBootResourcesByGlob';

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
 * .what = compute which brief refs to say vs ref based on curation globs
 * .why = applies the say-key semantics to determine say/ref partition
 *
 * .note = globs match against pathToOriginal (.md files)
 * .note = say-key semantics:
 *   - say: null → key was absent, say all resources
 *   - say: [] → key was present but empty, say none (all ref)
 *   - say: ['glob'] → say matched, ref unmatched
 */
const computeBriefRefPlan = async (input: {
  curation: ResourceCurationResolved | null;
  refs: RoleBriefRef[];
  cwd: string;
}): Promise<{ say: RoleBriefRef[]; ref: RoleBriefRef[] }> => {
  // no curation = say all (backwards compat, key absent at resource level)
  if (!input.curation) {
    return { say: input.refs, ref: [] };
  }

  // say: null means say key was absent -> say all
  if (input.curation.say === null) {
    // ref globs still apply if present
    if (input.curation.ref.length > 0) {
      const refMatched = await filterByGlob({
        items: input.refs,
        globs: input.curation.ref,
        cwd: input.cwd,
        getMatchPath: (ref) => ref.pathToOriginal,
      });
      const refSet = new Set(refMatched.map((r) => r.pathToOriginal));
      const sayRefs = input.refs.filter((r) => !refSet.has(r.pathToOriginal));
      return { say: sayRefs, ref: refMatched };
    }
    return { say: input.refs, ref: [] };
  }

  // say: [] means say key was present but empty -> say none
  if (input.curation.say.length === 0) {
    return { say: [], ref: input.refs };
  }

  // say: ['glob', ...] means say matched, ref unmatched
  const sayMatched = await filterByGlob({
    items: input.refs,
    globs: input.curation.say,
    cwd: input.cwd,
    getMatchPath: (ref) => ref.pathToOriginal,
  });
  const saySet = new Set(sayMatched.map((r) => r.pathToOriginal));
  const refRefs = input.refs.filter((r) => !saySet.has(r.pathToOriginal));

  return { say: sayMatched, ref: refRefs };
};

/**
 * .what = compute which skill paths to say vs ref based on curation globs
 * .why = applies the say-key semantics to determine say/ref partition
 *
 * .note = skills remain as paths (no minified variant)
 */
const computeSkillPathPlan = async (input: {
  curation: ResourceCurationResolved | null;
  paths: string[];
  cwd: string;
}): Promise<{ say: string[]; ref: string[] }> => {
  // no curation = say all (backwards compat, key absent at resource level)
  if (!input.curation) {
    return { say: input.paths, ref: [] };
  }

  // say: null means say key was absent -> say all
  if (input.curation.say === null) {
    // ref globs still apply if present
    if (input.curation.ref.length > 0) {
      const refMatched = await filterPathsByGlob({
        paths: input.paths,
        globs: input.curation.ref,
        cwd: input.cwd,
      });
      const refSet = new Set(refMatched);
      const sayPaths = input.paths.filter((p) => !refSet.has(p));
      return { say: sayPaths, ref: refMatched };
    }
    return { say: input.paths, ref: [] };
  }

  // say: [] means say key was present but empty -> say none
  if (input.curation.say.length === 0) {
    return { say: [], ref: input.paths };
  }

  // say: ['glob', ...] means say matched, ref unmatched
  const sayMatched = await filterPathsByGlob({
    paths: input.paths,
    globs: input.curation.say,
    cwd: input.cwd,
  });
  const saySet = new Set(sayMatched);
  const refPaths = input.paths.filter((p) => !saySet.has(p));

  return { say: sayMatched, ref: refPaths };
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
  const briefsPlan = await computeBriefRefPlan({
    curation: input.config.briefs,
    refs: input.briefRefs,
    cwd: input.cwd,
  });

  const skillsPlan = await computeSkillPathPlan({
    curation: input.config.skills,
    paths: input.skillPaths,
    cwd: input.cwd,
  });

  return {
    briefs: briefsPlan,
    skills: skillsPlan,
    also: { briefs: [], skills: [] },
  };
};

/**
 * .what = collects explicitly claimed resources from a subject section
 * .why = in subject mode, only resources that match explicit globs are claimed
 *
 * .note = unlike computeBriefRefPlan (for simple mode), this does NOT treat
 *         unmatched resources as ref. only explicitly matched resources are returned.
 */
const collectResourcesFromSection = async (input: {
  section: SubjectSectionResolved | null;
  briefRefs: RoleBriefRef[];
  skillPaths: string[];
  cwd: string;
}): Promise<{
  briefsSay: RoleBriefRef[];
  briefsRef: RoleBriefRef[];
  skillsSay: string[];
  skillsRef: string[];
}> => {
  if (!input.section) {
    return { briefsSay: [], briefsRef: [], skillsSay: [], skillsRef: [] };
  }

  // collect briefs that explicitly match say/ref globs
  let briefsSay: RoleBriefRef[] = [];
  let briefsRef: RoleBriefRef[] = [];

  if (input.section.briefs) {
    // say globs: match and claim as say
    if (input.section.briefs.say && input.section.briefs.say.length > 0) {
      briefsSay = await filterByGlob({
        items: input.briefRefs,
        globs: input.section.briefs.say,
        cwd: input.cwd,
        getMatchPath: (ref) => ref.pathToOriginal,
      });
    }

    // ref globs: match and claim as ref (exclude already said)
    if (input.section.briefs.ref.length > 0) {
      const refMatched = await filterByGlob({
        items: input.briefRefs,
        globs: input.section.briefs.ref,
        cwd: input.cwd,
        getMatchPath: (ref) => ref.pathToOriginal,
      });
      const saySet = new Set(briefsSay.map((r) => r.pathToOriginal));
      briefsRef = refMatched.filter((r) => !saySet.has(r.pathToOriginal));
    }
  }

  // collect skills that explicitly match say/ref globs
  let skillsSay: string[] = [];
  let skillsRef: string[] = [];

  if (input.section.skills) {
    // say globs: match and claim as say
    if (input.section.skills.say && input.section.skills.say.length > 0) {
      skillsSay = await filterPathsByGlob({
        paths: input.skillPaths,
        globs: input.section.skills.say,
        cwd: input.cwd,
      });
    }

    // ref globs: match and claim as ref (exclude already said)
    if (input.section.skills.ref.length > 0) {
      const refMatched = await filterPathsByGlob({
        paths: input.skillPaths,
        globs: input.section.skills.ref,
        cwd: input.cwd,
      });
      const saySet = new Set(skillsSay);
      skillsRef = refMatched.filter((p) => !saySet.has(p));
    }
  }

  return { briefsSay, briefsRef, skillsSay, skillsRef };
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
  // track which resources have been said (for dedupe, by pathToOriginal)
  const saidBriefs = new Set<string>();
  const saidSkills = new Set<string>();

  // track which resources are in any section (for also, by pathToOriginal)
  const claimedBriefs = new Set<string>();
  const claimedSkills = new Set<string>();

  // lookup ref by pathToOriginal for also section
  const briefRefByOriginal = new Map<string, RoleBriefRef>();
  for (const ref of input.briefRefs) {
    briefRefByOriginal.set(ref.pathToOriginal, ref);
  }

  // result collections
  const briefsSay: RoleBriefRef[] = [];
  const briefsRef: RoleBriefRef[] = [];
  const skillsSay: string[] = [];
  const skillsRef: string[] = [];

  // process always section first
  const alwaysResult = await collectResourcesFromSection({
    section: input.config.always,
    briefRefs: input.briefRefs,
    skillPaths: input.skillPaths,
    cwd: input.cwd,
  });

  // add always say resources
  for (const ref of alwaysResult.briefsSay) {
    briefsSay.push(ref);
    saidBriefs.add(ref.pathToOriginal);
    claimedBriefs.add(ref.pathToOriginal);
  }
  for (const path of alwaysResult.skillsSay) {
    skillsSay.push(path);
    saidSkills.add(path);
    claimedSkills.add(path);
  }

  // add always ref resources (unless already said)
  for (const ref of alwaysResult.briefsRef) {
    if (!saidBriefs.has(ref.pathToOriginal)) {
      briefsRef.push(ref);
    }
    claimedBriefs.add(ref.pathToOriginal);
  }
  for (const path of alwaysResult.skillsRef) {
    if (!saidSkills.has(path)) {
      skillsRef.push(path);
    }
    claimedSkills.add(path);
  }

  // determine which subjects to process
  const subjectSlugs = Object.keys(input.config.subjects);
  const selectedSlugs = input.subjects ?? subjectSlugs;

  // validate selected subjects exist
  if (input.subjects) {
    for (const slug of input.subjects) {
      if (!subjectSlugs.includes(slug)) {
        throw new BadRequestError(`subject not found: ${slug}`, {
          available: subjectSlugs,
          requested: input.subjects,
        });
      }
    }
  }

  // process each selected subject
  for (const slug of selectedSlugs) {
    const section = input.config.subjects[slug];
    if (!section) continue;

    const subjectResult = await collectResourcesFromSection({
      section,
      briefRefs: input.briefRefs,
      skillPaths: input.skillPaths,
      cwd: input.cwd,
    });

    // add subject say resources (say wins over ref)
    for (const ref of subjectResult.briefsSay) {
      if (saidBriefs.has(ref.pathToOriginal)) {
        // already said, add as ref (dedupe)
        const alreadyRef = briefsRef.some(
          (r) => r.pathToOriginal === ref.pathToOriginal,
        );
        if (!alreadyRef) {
          briefsRef.push(ref);
        }
      } else {
        briefsSay.push(ref);
        saidBriefs.add(ref.pathToOriginal);
      }
      claimedBriefs.add(ref.pathToOriginal);
    }
    for (const path of subjectResult.skillsSay) {
      if (saidSkills.has(path)) {
        // already said, add as ref (dedupe)
        if (!skillsRef.includes(path)) {
          skillsRef.push(path);
        }
      } else {
        skillsSay.push(path);
        saidSkills.add(path);
      }
      claimedSkills.add(path);
    }

    // add subject ref resources (unless already said)
    for (const ref of subjectResult.briefsRef) {
      const alreadyRef = briefsRef.some(
        (r) => r.pathToOriginal === ref.pathToOriginal,
      );
      if (!saidBriefs.has(ref.pathToOriginal) && !alreadyRef) {
        briefsRef.push(ref);
      }
      claimedBriefs.add(ref.pathToOriginal);
    }
    for (const path of subjectResult.skillsRef) {
      if (!saidSkills.has(path) && !skillsRef.includes(path)) {
        skillsRef.push(path);
      }
      claimedSkills.add(path);
    }
  }

  // compute also section (only when all subjects booted)
  const alsoBriefs: RoleBriefRef[] = [];
  const alsoSkills: string[] = [];

  if (!input.subjects) {
    // all subjects booted, include unclaimed resources in also
    for (const ref of input.briefRefs) {
      if (!claimedBriefs.has(ref.pathToOriginal)) {
        alsoBriefs.push(ref);
      }
    }
    for (const path of input.skillPaths) {
      if (!claimedSkills.has(path)) {
        alsoSkills.push(path);
      }
    }
  }

  return {
    briefs: { say: briefsSay, ref: briefsRef },
    skills: { say: skillsSay, ref: skillsRef },
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
