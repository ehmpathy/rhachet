import type {
  RoleContentDefect,
  RoleContentDefectKind,
} from '@src/domain.objects/RoleContentDefect';
import { asRepoSlugKind } from '@src/domain.operations/role/asRepoSlugKind';

/**
 * .what = what the render did with each kind of defect, and the fix that clears it
 * .why = one sentence per kind, keyed by every kind, so a new kind with no note fails the type
 *        check and every surface (birth receipt, stop readout, stop warn) reads one way
 */
const NOTE_BY_KIND: {
  [K in RoleContentDefectKind]: {
    setAside: string;
    fix: string;
    isModLever: boolean;
  };
} = {
  'orphan-min': {
    setAside: 'an orphan .md.min, skipped',
    fix: 'restore its .md source, or delete the .md.min',
    isModLever: true, // a mod can add the absent .md beside it
  },
  'boundary-literal': {
    setAside: 'holds the cache boundary literal, defanged',
    fix: 'name it another way, e.g. "the system prompt boundary line"',
    isModLever: true, // a mod can shadow the brief
  },
  'spec-unparsed': {
    // the row above names the file, so the note opens on the fact. the kind spans a yaml fault
    //   and a schema refusal, so the note names neither; the detail row names which. the focus
    //   receipt says when a focus on the role takes effect (`asRoleFocusReceiptLines`)
    setAside: 'refused as a boot spec, so the role boots refs-only',
    fix: 'repair what the row below names',
    isModLever: false, // a mod's own boot.yml never shadows the published one
  },
};

/**
 * .what = the file a mod writes to repair a linked role's defect, beside the role's own path
 * .why = a lever is a path to write, never a dir to guess within; an orphan's mod supplies the
 *        absent `.md` source, a brief's mod shadows the brief itself
 */
const asModPathForDefect = (input: { defect: RoleContentDefect }): string => {
  const prefixRole = `.agent/repo=${input.defect.ref.repo}/role=${input.defect.ref.role}/`;
  const pathInRole = input.defect.pathToFile.startsWith(prefixRole)
    ? input.defect.pathToFile.slice(prefixRole.length)
    : input.defect.pathToFile;
  const pathModded =
    input.defect.kind === 'orphan-min'
      ? pathInRole.replace(/\.min$/, '')
      : pathInRole;
  return `.agent/repo=.mods/role=${input.defect.ref.role}/${pathModded}`;
};

/**
 * .what = the note rows for a defect — what was set aside, then each fix
 * .why = a set-aside that names no fix is a failhide; a linked role's file is its supplier's,
 *        so its note names each lever this repo holds: upgrade, a mod where one can reach the
 *        file, a report to the owner (`1.vision.experience.case=2`)
 *
 * .note = an owned defect is one row: the set-aside and its one fix. a linked defect is one row
 *   per lever, so each lever scans on its own line rather than inside one run-on
 * .note = a role repo ships as the package `rhachet-roles-<repo>`, so the report names that package
 */
export const asRoleContentDefectNote = (input: {
  defect: RoleContentDefect;
}): string[] => {
  const note = NOTE_BY_KIND[input.defect.kind];
  const isOwned = asRepoSlugKind({ slug: input.defect.ref.repo }) !== 'package';
  if (isOwned) return [`${note.setAside} — ${note.fix}`];

  // a mod is whole only with its boot.yml: `of:` names the role, and an add must be said
  //   (`howto.mod-a-role`); a lone file is refused at the next birth
  const leverMod = note.isModLever
    ? [
        `or mod via a write to ${asModPathForDefect({ defect: input.defect })} plus a .agent/repo=.mods/role=${input.defect.ref.role}/boot.yml with of: ${input.defect.ref.repo}/${input.defect.ref.role} that says the file, then rhx init --hooks`,
      ]
    : [];
  // rhachet ships no reporter, and a supplier's skill may not be linked here, so the report names
  //   the owner and the facts to hand them, never a command (`rule.forbid.supplier-assumptions-in-the-framework`)
  const leverReport = `or report ${input.defect.kind} in repo=${input.defect.ref.repo}/role=${input.defect.ref.role} to the owner of the rhachet-roles-${input.defect.ref.repo} package`;
  return [
    `${note.setAside} — upgrade via rhx upgrade`,
    ...leverMod,
    leverReport,
  ];
};
