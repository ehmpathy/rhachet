import { ConstraintError } from 'helpful-errors';

import { BRAIN_CLI_BOOT_FLAG } from './asBrainCliSpawnArgs';

// the brain-cli flags that REPLACE the system prompt. rhachet owns that slot (it pins the
// actor's boot.md via `BRAIN_CLI_BOOT_FLAG`), so a passthrough copy of either would race
// rhachet's own for the one value the cli keeps
const SYSTEM_PROMPT_OWNED_FLAGS = ['--system-prompt', BRAIN_CLI_BOOT_FLAG];

/**
 * .what = refuse an enroll whose brain passthrough would override the system prompt
 * .why =
 *   - rhachet owns the boot context: every clone spawns with `--system-prompt-file
 *     <boot.md>`, so the actor's corpus is the system prompt. a second prompt flag in the
 *     passthrough would leave the cli to pick one of two values, and which one wins is the
 *     cli's parse detail — a silent fork of the one prompt all clones of an actor must share
 *   - refused before any write, so a rejected enroll leaves no actor dir behind
 *
 * .note = `--append-system-prompt[-file]` stays allowed. it ADDS after rhachet's boot
 *   rather than replace it, so the owned slot keeps one writer and the boot's cached
 *   prefix holds
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
      hint: "rhachet spawns every clone with its actor's boot.md as the system prompt. to add text, pass `--append-system-prompt <text>`, or `--append-system-prompt-file <path>` for a file; to change what a clone knows, add a brief to one of its roles",
    },
  );
};
