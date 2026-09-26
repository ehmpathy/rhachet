import { ConstraintError } from 'helpful-errors';

// the brain-cli flags that REPLACE the system prompt. rhachet owns that slot (it pins `''`),
// so a passthrough copy of either would race rhachet's own for the one value the cli keeps
const SYSTEM_PROMPT_OWNED_FLAGS = ['--system-prompt', '--system-prompt-file'];

/**
 * .what = refuse an enroll whose brain passthrough would override the system prompt
 * .why =
 *   - rhachet owns the boot context: every clone spawns with `--system-prompt ''`, and the
 *     actor's corpus arrives via CLAUDE.md. a second `--system-prompt` in the passthrough
 *     would leave the cli to pick one of two values, and which one wins is the cli's
 *     parse detail — a silent fork of the one prompt all clones of an actor must share
 *   - refused before any write, so a rejected enroll leaves no actor dir behind
 *
 * .note = `--append-system-prompt[-file]` stays allowed. it ADDS to rhachet's empty base
 *   rather than replace it, so the owned slot keeps one writer
 */
export const assertBrainCliPassthroughLeavesSystemPromptOwned = (input: {
  passthrough: string[];
}): void => {
  // find each passthrough token that names an owned flag, spaced or `=` inline form
  const overrides = input.passthrough.filter((token) =>
    SYSTEM_PROMPT_OWNED_FLAGS.some(
      (flag) => token === flag || token.startsWith(`${flag}=`),
    ),
  );
  if (overrides.length === 0) return;

  // refuse, and name the additive flag that fits the same need
  throw new ConstraintError(
    'enroll owns the system prompt; the passthrough may not override it',
    {
      overrides,
      hint: "rhachet spawns every clone with `--system-prompt ''` and boots its briefs via CLAUDE.md. to add text, pass `--append-system-prompt <text>`; to change what a clone knows, add a brief to one of its roles",
    },
  );
};
