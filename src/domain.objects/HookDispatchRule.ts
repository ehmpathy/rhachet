import { DomainLiteral } from 'domain-objects';

/**
 * .what = how the hook dispatcher runs one rule
 *
 * - `rhx-skill` = a `rhx <skill>` command, run as the skill file it names, framed as rhx framed it
 * - `rhx-init`  = a `rhachet run --init` command, run as the init file it names, framed as rhx framed it
 * - `shell`     = a `bash <path>` command, run as that file
 * - `exec`      = an rhx skill or init whose shebang is not bash, run as its own process
 * - `foreign`   = any other command, run as claude ran it (`/bin/sh -c`)
 */
export type HookDispatchRuleKind =
  | 'rhx-skill'
  | 'rhx-init'
  | 'shell'
  | 'exec'
  | 'foreign';

/**
 * .what = one role hook rule, as the hook dispatcher reads it from the manifest
 * .why = the dispatcher is one bash process per claude event; it needs each rule's matcher,
 *   timeout, and the file to run, computed once at sync, so a tool call boots no rhx to find it
 *
 * .note = `event` and `matcher` are claude's (`PreToolUse`, `Write|Edit`), as the adapter wrote them
 * .note = `path` is relative to the repo root; empty for a `foreign` rule
 * .note = `frame` is the header rhx printed (`🪨 run solid skill repo=…/role=…/skill=…`); empty
 *   for a rule rhx never ran
 * .note = `args` are the args the rule file receives, as rhx passed them (`--skill <slug> …`)
 * .note = `command` and `when` are the declared hook's, kept so a sync diffs against them and a
 *   rule whose file vanished still runs as declared
 */
export interface HookDispatchRule {
  event: string;
  matcher: string;
  timeoutSeconds: number;
  author: string;
  kind: HookDispatchRuleKind;
  path: string;
  frame: string;
  args: string[];
  command: string;
  when: 'before' | 'after' | null;
}

export class HookDispatchRule
  extends DomainLiteral<HookDispatchRule>
  implements HookDispatchRule {}
