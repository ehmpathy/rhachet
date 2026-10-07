import { asCliErrorClassified } from './asCliErrorClassified';
import { asCliErrorFrame } from './asCliErrorFrame';
import { getExitCodeFromError } from './getExitCodeFromError';

/**
 * .what = render a failed cli run for the human, then exit with its semantic code
 *
 * ⚠️ it catches EVERY throw, classified or not — this is the LAST handler, and past it sits
 *   the runtime's own uncaught-exception dump. an `instanceof HelpfulError` gate here would hand
 *   that dump to a human for every error our contract has not classified yet.
 *
 * ⚠️ it must wrap the WHOLE entrypoint, never `parseAsync` alone: a config load, a command
 *   registration, and a uniqueness check all throw ABOVE that call.
 *
 * 🔴 .why it is SHARED across all three entries = each entry is a separate process root, so each
 *   owns its own last handler. the two bun entries (`invoke.bun.entry.run`, `…roles`) had NONE,
 *   so every throw escaped to bun's default render. walked on `rhx nosuchskill`, which printed
 *   six lines of `helpful-errors/dist/HelpfulError.js` source with a caret, a ten-frame stack
 *   through `node_modules/.pnpm/…`, and a `Bun v1.3.5 (Linux x64)` footer — then exited **1**
 *   for an error its own text classified `✋ ConstraintError`, which owes **2**
 *   (`rule.require.exit-code-semantics`). one shared handler is what keeps the three renders
 *   identical from here on (`rule.prefer.wet-over-dry` — the third usage is what earns the
 *   extract)
 *
 * .note = the `[args]` trailer is this handler's own context. the wrapped path
 *   (`withCliOutputErrors`) knows its args from its own invoker and does not want the line
 *
 * .note = callers place it INSIDE the emoji shim, so the frame's `💥`/`✋` keep the terminal
 *   width the shim exists to hold
 */
export const emitCliErrorAndExit = (input: {
  error: unknown;
  args: string[];
}): never => {
  const error = asCliErrorClassified({ error: input.error });

  // ⚠️ the SHARED frame, never `.message` — a `HelpfulError`'s `.message` appends its
  //   serialized metadata. `asCliErrorFrame` is the one owner of what a human reads off a
  //   cli error, so this path and `withCliOutputErrors` cannot drift apart
  for (const line of asCliErrorFrame({ error })) console.error(line);
  console.error(`[args] ${input.args}`);
  console.error(``);

  // the class's own code (ConstraintError = 2, MalfunctionError = 1)
  return process.exit(getExitCodeFromError({ error }));
};
