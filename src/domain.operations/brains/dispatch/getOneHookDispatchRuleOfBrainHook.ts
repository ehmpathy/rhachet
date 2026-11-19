import { ConstraintError } from 'helpful-errors';

import type { BrainHook } from '@src/domain.objects/BrainHook';
import {
  HookDispatchRule,
  type HookDispatchRuleKind,
} from '@src/domain.objects/HookDispatchRule';
import { asRoleFileRunFrame } from '@src/domain.operations/invoke/asRoleFileRunFrame';

import { closeSync, openSync, readSync } from 'node:fs';
import { join } from 'node:path';
import { asClaudeEventOfBrainHookEvent } from './asClaudeEventOfBrainHookEvent';
import { asTimeoutSecondsOfBrainHook } from './asTimeoutSecondsOfBrainHook';
import {
  HOOK_DISPATCH_RHX_SHORT_CIRCUITS,
  HOOK_DISPATCH_RUN_FLAGS,
} from './constants';
import { getAllRoleExecutablesBySlug } from './getAllRoleExecutablesBySlug';
import { isHookMatcherPortable } from './isHookMatcherPortable';

/**
 * .what = the words a shell reads as plain words: no quote, no expansion, no redirect
 * .why = only a command of plain words can be split here exactly as the shell split it; any
 *   other command runs as declared
 */
const PLAIN_WORDS = /^[A-Za-z0-9_\-./:@=+, ]+$/;

// the route tables of `rhachet run` and `bin/rhx`, each held to its owner by a parity test
const RUN_FLAGS = new Set(HOOK_DISPATCH_RUN_FLAGS);
const RHX_SHORT_CIRCUITS = new Set(HOOK_DISPATCH_RHX_SHORT_CIRCUITS);

/**
 * .what = whether commander could read a word as a `rhachet run` flag, in any form it accepts:
 *   the flag alone (`--role`), a long flag with its value glued on (`--role=x`), or a short flag
 *   with its value glued on (`-rx`)
 * .why = such a word past the skill name may be read by rhx, not the skill; uncertain → foreign
 */
const isRunFlagWord = (input: { word: string }): boolean => {
  if (RUN_FLAGS.has(input.word)) return true;
  const flagLong = input.word.startsWith('--')
    ? input.word.split('=')[0]!
    : null;
  if (flagLong && input.word.includes('=') && RUN_FLAGS.has(flagLong))
    return true;
  const flagShort = /^-[A-Za-z]/.test(input.word)
    ? input.word.slice(0, 2)
    : null;
  return !!flagShort && RUN_FLAGS.has(flagShort);
};

/**
 * .what = the dispatcher rule for one declared role hook: its kind, the file it runs, its args
 * .why = the dispatcher runs each rule as rhx or bash ran it, minus the boot. that needs the file
 *   `rhx <skill>` would find, computed once here at sync, never per tool call
 *
 * .note = rhx hands a skill every arg after `run`: `rhx X --mode hook` runs `X.sh --skill X
 *   --mode hook`, and `rhachet run --repo R --role L --init I` runs `I.sh --repo R --role L
 *   --init I`. the rule keeps those args exactly
 * .note = a command this cannot read for certain runs as declared (`foreign`): the same process
 *   claude ran, so its verdict cannot drift
 */
export const getOneHookDispatchRuleOfBrainHook = (input: {
  hook: BrainHook;
  repoPath: string;
}): HookDispatchRule => {
  const { hook } = input;

  // a matcher the dispatcher's bash would read otherwise than claude did is refused here, at sync
  const matcher = hook.filter?.what ?? '*';
  if (!isHookMatcherPortable({ matcher }))
    throw new ConstraintError(
      'a role hook matcher uses regex syntax that bash and claude would match differently',
      {
        author: hook.author,
        command: hook.command,
        matcher,
        hint: 'declare the matcher as an exact list (`Read|Write`) or a plain regex (`mcp__.*`): no \\d \\w \\s \\b, no (?…), no lazy quantifier',
      },
    );

  // the fields every kind shares, as the claude adapter would write them
  const shared = {
    event: asClaudeEventOfBrainHookEvent({ event: hook.event }),
    matcher,
    timeoutSeconds: asTimeoutSecondsOfBrainHook({ timeout: hook.timeout }),
    author: hook.author,
    command: hook.command,
    when: hook.filter?.when ?? null,
  };
  const ofKind = (body: {
    kind: HookDispatchRuleKind;
    path: string;
    frame: string;
    args: string[];
  }): HookDispatchRule =>
    asRuleRefusedOnRowBreaker({
      rule: new HookDispatchRule({ ...shared, ...body }),
    });
  const asForeign = () =>
    ofKind({ kind: 'foreign', path: '', frame: '', args: [] });

  // only plain words split here exactly as the shell split them
  const command = hook.command.trim();
  if (!PLAIN_WORDS.test(command)) return asForeign();
  const words = command.split(/ +/);

  // `bash <path> [args]` → the file, run as bash ran it
  if (words[0] === 'bash' && words[1] && !words[1].startsWith('-'))
    return ofKind({
      kind: 'shell',
      path: words[1],
      frame: '',
      args: words.slice(2),
    });

  // `rhx <skill> [args]` → the skill file rhx would find
  const rhxTail = asTailAfterBin({ words, bin: 'rhx' });
  if (rhxTail) {
    const [slug, ...rest] = rhxTail;
    if (!slug || slug.startsWith('-') || RHX_SHORT_CIRCUITS.has(slug))
      return asForeign();
    if (rest.some((word) => isRunFlagWord({ word }))) return asForeign();
    return getOneRuleOfRoleFile({
      repoPath: input.repoPath,
      dir: 'skills',
      slug,
      slugRepo: null,
      slugRole: null,
      args: ['--skill', slug, ...rest],
      ofKind,
      asForeign,
    });
  }

  // `rhachet run --skill|--init X [--repo R] [--role L] [args]` → the file rhx would find
  const rhachetTail = asTailAfterBin({ words, bin: 'rhachet' });
  if (rhachetTail && rhachetTail[0] === 'run') {
    const args = rhachetTail.slice(1);
    const flags = asRunFlagsLead({ words: args });
    if (!flags) return asForeign();
    const isSkill = !!flags.skill && !flags.init;
    const isInit = !!flags.init && !flags.skill;
    if (!isSkill && !isInit) return asForeign();
    return getOneRuleOfRoleFile({
      repoPath: input.repoPath,
      dir: isSkill ? 'skills' : 'inits',
      slug: (isSkill ? flags.skill : flags.init)!,
      slugRepo: flags.repo,
      slugRole: flags.role,
      args,
      ofKind,
      asForeign,
    });
  }

  // any other command runs as declared
  return asForeign();
};

/**
 * .what = the rule as given, or a refusal when any of its fields holds a newline or a field
 *   separator
 * .why = every field lands in one manifest row; such a character would split the row, and the
 *   dispatcher would read a rule no role declared. refused here, at sync, for every field
 */
const asRuleRefusedOnRowBreaker = (input: {
  rule: HookDispatchRule;
}): HookDispatchRule => {
  const { rule } = input;
  const fields: Record<string, string> = {
    matcher: rule.matcher,
    author: rule.author,
    command: rule.command,
    path: rule.path,
    frame: rule.frame,
    when: rule.when ?? '',
    ...Object.fromEntries(rule.args.map((arg, at) => [`args[${at}]`, arg])),
  };
  const fieldsBroken = Object.entries(fields)
    .filter(([, value]) =>
      ['\n', '\r', '\x1e', '\x1f'].some((char) => value.includes(char)),
    )
    .map(([name]) => name);
  if (fieldsBroken.length)
    throw new ConstraintError('a role hook holds a line break', {
      author: rule.author,
      command: rule.command,
      fieldsBroken,
      hint: 'declare the hook on one line, in the role that authors it',
    });
  return rule;
};

/**
 * .what = the words after a bin name, reached as `<bin>`, `./node_modules/.bin/<bin>`, or `npx <bin>`
 */
const asTailAfterBin = (input: {
  words: string[];
  bin: string;
}): string[] | null => {
  const [first, second] = input.words;
  if (first === input.bin || first === `./node_modules/.bin/${input.bin}`)
    return input.words.slice(1);
  if (first === 'npx' && second === input.bin) return input.words.slice(2);
  return null;
};

/**
 * .what = the run flags that lead a `rhachet run` tail, read as commander reads them; null when
 *   a run flag also shows up past the lead, where the read is no longer certain
 */
const asRunFlagsLead = (input: {
  words: string[];
}): {
  skill: string | null;
  init: string | null;
  repo: string | null;
  role: string | null;
} | null => {
  const keyOf: Record<string, 'skill' | 'init' | 'repo' | 'role'> = {
    '--skill': 'skill',
    '-s': 'skill',
    '--init': 'init',
    '-i': 'init',
    '--repo': 'repo',
    '--role': 'role',
    '-r': 'role',
  };

  // read the words two at a time, as commander reads flag pairs
  const pairs = Array.from(
    { length: Math.ceil(input.words.length / 2) },
    (_, at) => ({
      key: keyOf[input.words[at * 2]!],
      value: input.words[at * 2 + 1],
    }),
  );

  // the lead: each pair before the first that is not a run flag with a value
  // .note = a deliberate local read: commander parses pairs until the first unknown word
  const indexEnd = pairs.findIndex(
    (pair) => !pair.key || !pair.value || pair.value.startsWith('-'),
  );
  const pairsLead = pairs
    .slice(0, indexEnd < 0 ? pairs.length : indexEnd)
    .flatMap((pair) =>
      pair.key && pair.value ? [{ key: pair.key, value: pair.value }] : [],
    );

  // a flag given twice, or a run flag past the lead, is a read rhx may not make; uncertain → null
  const keysLead = pairsLead.map((pair) => pair.key);
  if (new Set(keysLead).size !== keysLead.length) return null;
  const wordsPast = input.words.slice(pairsLead.length * 2);
  if (wordsPast.some((word) => isRunFlagWord({ word }))) return null;

  // the value of each run flag the lead names
  const getValueOfFlag = (
    key: 'skill' | 'init' | 'repo' | 'role',
  ): string | null => pairsLead.find((pair) => pair.key === key)?.value ?? null;
  return {
    skill: getValueOfFlag('skill'),
    init: getValueOfFlag('init'),
    repo: getValueOfFlag('repo'),
    role: getValueOfFlag('role'),
  };
};

/**
 * .what = the rule for a role file rhx would run, or `foreign` when rhx would find none or many
 */
const getOneRuleOfRoleFile = (input: {
  repoPath: string;
  dir: 'skills' | 'inits';
  slug: string;
  slugRepo: string | null;
  slugRole: string | null;
  args: string[];
  ofKind: (body: {
    kind: HookDispatchRuleKind;
    path: string;
    frame: string;
    args: string[];
  }) => HookDispatchRule;
  asForeign: () => HookDispatchRule;
}): HookDispatchRule => {
  // exactly one file, or rhx itself would refuse; that refusal stays rhx's own
  const found = getAllRoleExecutablesBySlug({
    repoPath: input.repoPath,
    dir: input.dir,
    slug: input.slug,
    slugRepo: input.slugRepo,
    slugRole: input.slugRole,
  });
  if (found.length !== 1) return input.asForeign();
  const file = found[0]!;

  // the frame rhx printed before the file ran
  const frame = asRoleFileRunFrame({
    dir: input.dir,
    slugRepo: file.slugRepo,
    slugRole: file.slugRole,
    slug: input.slug,
  });

  // rhx ran the file by its own shebang; a bash file may be sourced, any other runs as itself
  const isBash = isBashShebangOrNoneOfLine({
    line: getOneLineFirstOfFile({ path: join(input.repoPath, file.path) }),
  });
  return input.ofKind({
    kind: isBash ? (input.dir === 'skills' ? 'rhx-skill' : 'rhx-init') : 'exec',
    path: file.path,
    frame,
    args: input.args,
  });
};

/**
 * .what = the first line of a file, read from its first 128 bytes (a shebang fits within)
 * .why = the read is the i/o; the shebang verdict stays a pure check on the line
 */
const getOneLineFirstOfFile = (input: { path: string }): string => {
  const fd = openSync(input.path, 'r');
  try {
    const buffer = Buffer.alloc(128);
    const bytes = readSync(fd, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytes).toString('utf-8').split('\n')[0]!;
  } finally {
    closeSync(fd);
  }
};

/**
 * .what = whether a file's first line runs it under bash: a bash shebang, or none (bash runs a
 *   file with none)
 */
const isBashShebangOrNoneOfLine = (input: { line: string }): boolean => {
  if (!input.line.startsWith('#!')) return true;
  return /\bbash\b/.test(input.line);
};
