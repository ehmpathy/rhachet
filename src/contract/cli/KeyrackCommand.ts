import { Command } from 'commander';
import { ConstraintError } from 'helpful-errors';

import { emitKeyrackBlockedReport } from '@src/domain.operations/keyrack/cli/emitKeyrackBlockedReport';

/**
 * .what = the command path a human typed, read off commander's own parent chain
 * .why = the blocked report names the command, and the name must be the one the human used —
 *        `keyrack infra init`, not `init`. commander already holds that path, so to read it
 *        beats a hand-written string per site: a hand-written one can disagree with the verb
 *        it labels, and a renamed subcommand would not update it
 */
const asKeyrackCommandPath = (input: { command: Command }): string => {
  const names: string[] = [];
  let cursor: Command | null = input.command;
  while (cursor) {
    names.unshift(cursor.name());
    if (cursor.name() === 'keyrack') break;
    cursor = cursor.parent;
  }
  return names.join(' ');
};

/**
 * .what = a commander `Command` whose every action renders a `ConstraintError` as the keyrack
 *         blocked tree, and whose every subcommand inherits that same guarantee
 * .why = the alternative is to hold the render-consistency rule by DISCIPLINE AT EVERY CALL SITE.
 *        an `*OrEmitBlocked` operation closes one refusal and makes no claim about the next, so
 *        a family guarded that way is only ever one new throw away from an inconsistent render —
 *        and the defect is invisible until a human hits that one verb. the class moves the
 *        guarantee from per-site vigilance to the type every subcommand inherits
 *        (`rule.require.solve-at-cause`)
 *
 * ⚠️ .why.class = the residue was FLAG VALIDATION, and it was uniform: `invalid --vault`,
 *        `invalid --mech`, `invalid --env`, `--strict`/`--lenient` mutually exclusive,
 *        `sudo requires --key`, `malformed secrets json` — seventeen throws across six verbs,
 *        each one caller-fixable, each one landed as a flush-left `✋ ConstraintError:` with an
 *        `[args]` dump from the generic top-level handler. `firewall`'s own comment warned
 *        against that exact render three lines below five throws that produced it
 *
 * .note = `createCommand` is commander's documented subclass hook, so the guarantee propagates
 *         to EVERY descendant automatically — `infra`, `recipient`, `daemon`, and any verb a
 *         future round adds. that is what makes this a boundary rather than a seventeenth patch:
 *         a new raw `ConstraintError` cannot reintroduce the defect, because there is no longer
 *         a path from a keyrack action to the generic handler
 * .note = only a `ConstraintError` is a rendered refusal; every other class rethrows untouched
 *         and reaches the top-level handler exactly as before (`rule.forbid.failhide`)
 * .note = the two `*OrEmitBlocked` operations that REMAIN render an EARLY RETURN — they hand
 *         back `null` and the caller narrows and continues. that is a shape this class cannot
 *         serve, since a caught throw ends the action. so the two coexist by contract, never by
 *         duplication: this catches what ENDS a verb, they signal what a verb continues past.
 *         a refusal is byte-identical either way, since both call the one emitter
 *
 * ⚠️ .note.retired = three MORE `*OrEmitBlocked` operations existed and were DELETED once this
 *         class landed — `getOneKeyrackRepoScopeForAskOrEmitBlocked`,
 *         `getOneKeyrackFilterOrgOrEmitBlocked`, `getAllKeyrackGrantsByRepoOrEmitBlocked`. each
 *         caught a `ConstraintError`, emitted, then called `process.exit(2)`, which contradicts
 *         `emitKeyrackBlockedReport`'s own guarantee that it sets `process.exitCode` so queued
 *         stdout still flushes — a hard exit can truncate the very report it just wrote when
 *         stdout is a pipe. this class made all three redundant: the bare operation now throws
 *         and is caught here, which yields the same `const`-destructure ergonomic (a rejected
 *         promise never resolves) and drops ~9 hand-spelled `command: 'keyrack …'` strings in
 *         favor of the live `asKeyrackCommandPath` read (ehmpathy/rhachet#467)
 *
 * ⚠️ .note.lint = `extends Command` overruns biome's 200k type budget, so biome emits an
 *         `INTERNAL` on THIS FILE and its type-aware pass bails here. proven to be the subclass
 *         itself, not the `action` signature: a rewrite of that signature left the diagnostic
 *         unchanged. the diagnostic is warn-level, so `biome check --diagnostic-level=error`
 *         stays green. the trade is deliberate — `createCommand` propagation is the whole point
 *         of the class, and no other shape delivers it. keep this file small and keep its
 *         guarantee clamped by acceptance test, since lint cannot fully see it
 */
export class KeyrackCommand extends Command {
  public createCommand(name?: string): KeyrackCommand {
    return new KeyrackCommand(name);
  }

  /**
   * .note = the arg tuple is a GENERIC (`TArgs`), because an action's arity varies with the
   *         command's declared arguments. commander's own bound spells those args `any[]`, so to
   *         inherit it — `Parameters<Command['action']>[0]` — would put commander's `any` on
   *         every handler arg. the generic instead binds each handler to ITS OWN tuple, which is
   *         strictly tighter, writes no `any`, and needs no cast (`rule.forbid.as-cast`)
   * .note = `handler.call(this, …)` preserves the `this` commander binds to an action handler,
   *         so a handler that reads `this.opts()` behaves exactly as it did unwrapped
   */
  public action<TArgs extends unknown[]>(
    handler: (this: this, ...args: TArgs) => void | Promise<void>,
  ): this {
    return super.action(async (...args: TArgs) => {
      try {
        await handler.call(this, ...args);
      } catch (error) {
        // only a constraint is a rendered refusal; a malfunction is a defect and must surface
        if (!(error instanceof ConstraintError)) throw error;

        emitKeyrackBlockedReport({
          error,
          command: asKeyrackCommandPath({ command: this }),
        });
      }
    });
  }
}
