import { ConstraintError } from 'helpful-errors';

import type { RoleBriefRef } from '@src/domain.operations/role/briefs/getRoleBriefRefs';
import { extractSkillDocumentation } from '@src/domain.operations/role/extractSkillDocumentation';

import { readFileSync } from 'node:fs';

/**
 * .what = reads one say resource, and classifies a vanished file as a caller fault
 * .why = the say set is enumerated by a GLOB, and the read happens after it. a file the
 *        glob matched can be gone by the time we reach it — a rebase, a `pnpm install`
 *        that relinks a role, an editor that rewrites via unlink+create.
 *
 * 🔴 .note = an unclassified `ENOENT` escapes as a raw `Error`, which `getExitCodeFromError`
 *   defaults to exit **1** — a MALFUNCTION code for a fault the server did not commit
 *   (`rule.require.exit-code-semantics`). the caller's own tree moved, and a re-run on a
 *   settled tree fixes it, so it is exit 2 by the test `rule.require.failloud` sorts by.
 *   `calc.tokens` classifies the identical race the identical way.
 *
 * .note = only `ENOENT` is re-classed. a permission fault, a directory where a file was
 *   expected, or an i/o fault are NOT caller races, so they escape unchanged rather than
 *   be swept into one bucket (`rule.forbid.failhide`).
 */
const readOneSayResource = (input: {
  path: string;
  read: (path: string) => string;
}): string => {
  try {
    return input.read(input.path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error;
    throw new ConstraintError(
      'a boot say resource vanished between the glob and the read',
      {
        path: input.path,
        // .note = `why`, never `cause` — `cause` is reserved on an `Error`, and it must
        //   carry an `Error` rather than a sentence. a string there is a type fault
        why: 'the file matched the boot spec, then was removed or relinked',
        hint: 're-run the boot — a settled tree reads cleanly',
      },
    );
  }
};

/**
 * .what = one `say` resource — the tag it renders under, the path it cites, and its content
 * .why = the three say kinds differ only in how their content is READ; once read they render
 *        identically, so one shape serves the whole set
 */
export interface BootSayResource {
  tag: 'readme' | 'brief.say' | 'skill.say';
  pathToLabel: string;
  content: string;
}

/**
 * .what = reads every `say` resource a boot will render, once, in render order
 * .why = this is the boot assembler's ONE filesystem boundary for say content. before it
 *        existed the assembler read each say file TWICE — once to sum the `<stats>` char
 *        table, once to build the body — so a boot paid double i/o and the two reads could
 *        disagree if a file changed between them.
 *
 * .note = the `.md.min` variant is preferred where an author wrote one, which is what makes
 *   `condense` a remedy on the budget halt's ladder. the LABEL and the CONTENT resolve to
 *   one path here, so a block can never cite a file it did not render.
 *
 * .note = a `ref` resource is deliberately absent: a ref emits its path and never its
 *   content, so it costs no read at all.
 */
export const getAllBootSayResources = (input: {
  pathToReadme: string | null;
  briefsSay: RoleBriefRef[];
  skillsSay: string[];
}): BootSayResource[] => [
  ...(input.pathToReadme
    ? [
        {
          tag: 'readme' as const,
          pathToLabel: input.pathToReadme,
          content: readOneSayResource({
            path: input.pathToReadme,
            read: (path) => readFileSync(path, 'utf-8'),
          }),
        },
      ]
    : []),
  ...input.briefsSay.map((ref) => {
    const pathToRender = ref.pathToMinified ?? ref.pathToOriginal;
    return {
      tag: 'brief.say' as const,
      pathToLabel: pathToRender,
      content: readOneSayResource({
        path: pathToRender,
        read: (path) => readFileSync(path, 'utf-8'),
      }),
    };
  }),
  ...input.skillsSay.map((filepath) => ({
    tag: 'skill.say' as const,
    pathToLabel: filepath,
    content: readOneSayResource({
      path: filepath,
      read: (path) => extractSkillDocumentation(path),
    }),
  })),
];
