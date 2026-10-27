import { asReadonlyOutsideSettingsNoteLines } from './asReadonlyOutsideSettingsNoteLines';

/**
 * .what = print the read-only note once per distinct home file an actor's arrow reaches
 * .why = the human locked that file; the note says init reached it and left it untouched
 * .note = no target prints no line
 */
export const emitReadonlyOutsideSettingsNotes = (input: {
  repoPath: string;
  targets: { path: string; landsAt: string }[];
}): void => {
  for (const line of asReadonlyOutsideSettingsNoteLines(input))
    console.log(line);
};
