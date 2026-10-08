import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { MalfunctionError } from 'helpful-errors';

import { BRAIN_CLI_SPINUP_ENV_DEFAULTS } from '@src/domain.operations/enroll/asBrainCliSpawnEnv';

import { asLegibleScreen } from './asLegibleScreen';
import { invokeRhachetCliBinary } from './invokeRhachetCliBinary';

/**
 * .what = the sentinel token a fixture file carries, unique per run
 * .why = a brain can only quote a token it was handed; the nonce makes a guess or a
 *   stale transcript unable to satisfy a check
 */
export const asSentinel = (input: { of: string; nonce: string }): string =>
  `sntl${input.of}${input.nonce}`;

/**
 * .what = every sentinel token in a text, lowercased and deduped
 */
export const asSentinelsFound = (input: { text: string }): string[] =>
  Array.from(
    new Set(
      (input.text.match(/sntl[a-z0-9]+/gi) ?? []).map((token) =>
        token.toLowerCase(),
      ),
    ),
  );

/**
 * .what = the built claude-code hooks adapter of this repo
 * .why = the fixture brain package re-exports it, so `rhx init` syncs hooks with the real shape
 */
const ADAPTER_BUILT_PATH = resolve(
  __dirname,
  '../../..',
  'dist',
  '_topublish',
  'rhachet-brains-anthropic',
  'src',
  'hooks',
  'getBrainHooks.js',
);

const writeFileDeep =(input: { path: string; content: string }): void => {
  mkdirSync(dirname(input.path), { recursive: true });
  writeFileSync(input.path, input.content);
};

/**
 * .what = the three briefs of one fixture role: a head sentinel that opens the first
 *   sorted brief, a filler body, and a tail sentinel that closes the last
 * .why = the two sentinels bound the rendered corpus, so a truncated delivery drops the
 *   tail and fails the check
 * .note = the body is sized so ONE role clears haiku 4.5's minimum cacheable prefix of
 *   4096 tokens. an enrolled clone runs under an empty system prompt, so its corpus alone
 *   must clear that bar; a shorter one is silently never cached, and M2 would then
 *   measure the fixture's size rather than the transport
 */
export const asRoleBriefs = (input: {
  role: string;
  nonce: string;
}): { name: string; content: string }[] => [
  {
    name: 'a.head.md',
    content: `the ${input.role} head sentinel is ${asSentinel({ of: `${input.role}head`, nonce: input.nonce })}.\n\n# ${input.role} head\n\nthis brief opens role ${input.role}.\n`,
  },
  {
    name: 'm.body.md',
    content: `# ${input.role} body\n\n${Array.from(
      { length: 200 },
      (_, index) =>
        `- rule ${index} of role ${input.role}: each surfer checks the tide chart before a paddle out at spot ${index}.`,
    ).join('\n')}\n`,
  },
  {
    name: 'z.tail.md',
    content: `# ${input.role} tail\n\nthis brief closes role ${input.role}.\n\nthe ${input.role} tail sentinel is ${asSentinel({ of: `${input.role}tail`, nonce: input.nonce })}.\n`,
  },
];

/**
 * .what = the role boot hook a prior rhachet installed for role waxer
 * .why = [t1] asserts `rhx init` deletes it, while the adhoc hook and the human hook stay
 */
export const ROLES_BOOT_COMMAND_WAXER =
  './node_modules/.bin/rhachet roles boot --repo surfshop --role waxer';

/**
 * .what = a repo as a human holds it before this upgrade
 * .why = the brain-dir-boot journey needs a repo whose every brief it authored, so each
 *   sentinel is known and no file churns with a role package bump
 *
 * .note = the repo holds
 *   - native roles shaper, glasser, sander under `.agent/repo=.this/`
 *   - a package `rhachet-roles-surfshop` in its own `node_modules`, which declares role waxer
 *     (a role boot hook beside an adhoc hook) and role lifeguard (linked only at [t1.3])
 *   - a `.claude/settings.json` with the prior role boot hook of waxer and a human hook
 */
export const setupBrainDirBootFixtureRepo = (input: {
  dir: string;
  nonce: string;
}): void => {
  // a git repo with an identity, so the journey can commit and clone its tree
  spawnSync('git', ['init', '-q'], { cwd: input.dir });
  spawnSync('git', ['config', 'user.email', 'journey@example.com'], {
    cwd: input.dir,
  });
  spawnSync('git', ['config', 'user.name', 'Journey Human'], { cwd: input.dir });

  // the native roles, each opted into the boot by a boot.yml with no payload (all briefs say)
  for (const role of ['shaper', 'glasser', 'sander'])
    writeFileDeep({
      path: join(input.dir, '.agent', 'repo=.this', `role=${role}`, 'boot.yml'),
      content: '# boot every brief of this role\n',
    });
  for (const role of ['shaper', 'glasser', 'sander'])
    for (const brief of asRoleBriefs({ role, nonce: input.nonce }))
      writeFileDeep({
        path: join(
          input.dir,
          '.agent',
          'repo=.this',
          `role=${role}`,
          'briefs',
          brief.name,
        ),
        content: brief.content,
      });

  // the package that declares roles waxer and lifeguard
  const packageDir = join(input.dir, 'node_modules', 'rhachet-roles-surfshop');
  writeFileDeep({
    path: join(input.dir, 'package.json'),
    content: `${JSON.stringify(
      {
        name: 'journey-repo',
        version: '0.0.0',
        private: true,
        dependencies: {
          'rhachet-roles-surfshop': 'file:./node_modules/rhachet-roles-surfshop',
          'rhachet-brains-surfshop': 'file:./node_modules/rhachet-brains-surfshop',
        },
      },
      null,
      2,
    )}\n`,
  });
  writeFileDeep({
    path: join(packageDir, 'package.json'),
    content: `${JSON.stringify({ name: 'rhachet-roles-surfshop', version: '1.0.0', main: 'dist/index.js' }, null, 2)}\n`,
  });
  writeFileDeep({ path: join(packageDir, 'readme.md'), content: '# surfshop\n' });
  writeFileDeep({
    path: join(packageDir, 'rhachet.repo.yml'),
    content: [
      'slug: surfshop',
      'readme: readme.md',
      'roles:',
      ...['waxer', 'lifeguard'].flatMap((role) => [
        `  - slug: ${role}`,
        `    name: ${role}`,
        `    purpose: journey fixture role ${role}`,
        `    readme: roles/${role}/readme.md`,
        '    briefs:',
        `      dirs: roles/${role}/briefs`,
        '    skills:',
        `      dirs: roles/${role}/skills`,
      ]),
      '',
    ].join('\n'),
  });
  writeFileDeep({
    path: join(packageDir, 'dist', 'index.js'),
    content: `const asRole = (slug, hooks) => ({
  slug,
  name: slug,
  purpose: 'journey fixture role ' + slug,
  readme: { uri: 'roles/' + slug + '/readme.md' },
  traits: [],
  skills: { dirs: { uri: 'roles/' + slug + '/skills' }, refs: [] },
  briefs: { dirs: { uri: 'roles/' + slug + '/briefs' } },
  ...(hooks ? { hooks } : {}),
});
const getRoleRegistry = () => ({
  slug: 'surfshop',
  readme: { uri: 'readme.md' },
  roles: [
    asRole('waxer', {
      onBrain: {
        onBoot: [
          { command: '${ROLES_BOOT_COMMAND_WAXER}', timeout: 'PT60S' },
          { command: 'echo adhoc-waxer', timeout: 'PT5S' },
        ],
      },
    }),
    asRole('lifeguard'),
  ],
});
module.exports = { getRoleRegistry };
`,
  });
  for (const role of ['waxer', 'lifeguard']) {
    writeFileDeep({
      path: join(packageDir, 'roles', role, 'readme.md'),
      content: `# ${role}\n`,
    });
    writeFileDeep({
      path: join(packageDir, 'roles', role, 'skills', '.gitkeep'),
      content: '',
    });
    for (const brief of asRoleBriefs({ role, nonce: input.nonce }))
      writeFileDeep({
        path: join(packageDir, 'roles', role, 'briefs', brief.name),
        content: brief.content,
      });
  }

  // the claude-code hooks adapter: this repo's own built one, so hooks land in the shape a
  //   real claude reads. a toy adapter would pass the sync and fail the brain
  const brainsDir = join(input.dir, 'node_modules', 'rhachet-brains-surfshop');
  writeFileDeep({
    path: join(brainsDir, 'package.json'),
    content: `${JSON.stringify({ name: 'rhachet-brains-surfshop', version: '1.0.0', main: 'dist/index.js' }, null, 2)}\n`,
  });
  writeFileDeep({
    path: join(brainsDir, 'dist', 'index.js'),
    content: `module.exports = require(${JSON.stringify(ADAPTER_BUILT_PATH)});\n`,
  });

  // settings.json as a prior rhachet left it: waxer's role boot hook, and a human's hook
  writeFileDeep({
    path: join(input.dir, '.claude', 'settings.json'),
    content: `${JSON.stringify(
      {
        hooks: {
          SessionStart: [
            {
              // the claude-code adapter tags its author into the matcher
              matcher: '# author=repo=surfshop/role=waxer *',
              hooks: [
                { type: 'command', command: ROLES_BOOT_COMMAND_WAXER, timeout: 60000 },
              ],
            },
            {
              matcher: '*',
              hooks: [{ type: 'command', command: 'echo human-hook', timeout: 5000 }],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  });
};

/**
 * .what = every hash-identified actor dir of a repo, by name
 * .why = an enroll mints its actor dir by roleset hash; a diff of this set before and
 *   after names the dir the enroll made without a recompute of the hash
 */
export const getAllActorHashDirNames = (input: { dir: string }): string[] => {
  const actorsDir = join(input.dir, '.agent', '.actors');
  if (!existsSync(actorsDir)) return [];
  return readdirSync(actorsDir)
    .filter((name) => name.startsWith('actor.via.hash='))
    .sort();
};

/**
 * .what = the envelope keys whose value is DETERMINISTIC, so the mask leaves them live
 * .why = a mask neutralizes only the bytes that vary run to run; a deterministic value
 *   masked to `__STRING__` proves its key exists and proves none of what it says.
 *   `type` / `subtype` are the envelope's discriminators, with no dependence on the
 *   model's own behavior
 */
const ENVELOPE_KEYS_DETERMINISTIC = ['subtype', 'type'] as const;

/**
 * .what = the envelope keys this journey reads, at top level and under `usage`
 * .why = the test install tracks `@latest`, and each claude-code release adds and drops
 *   envelope keys (`safety_stops`, `fallback_credit`) and moves the `haiku` alias to a new
 *   model — which renames the `modelUsage` key and its `canonicalModel`. a lock on the
 *   whole envelope reddens on a vendor release, never on a rhachet change. the keys the
 *   journey reads are the contract, so those alone are locked
 */
const ENVELOPE_KEYS_READ = [
  'is_error',
  'result',
  'subtype',
  'type',
  'usage',
] as const;
const ENVELOPE_USAGE_KEYS_READ = [
  'cache_creation_input_tokens',
  'cache_read_input_tokens',
  'input_tokens',
] as const;

/**
 * .what = a claude `--output-format json` envelope, narrowed to the keys the journey
 *   reads, with every volatile value masked
 * .why = the read keys are the contract a snapshot locks
 * .note = a key in `ENVELOPE_KEYS_DETERMINISTIC` keeps its live value, so the snapshot
 *   locks more of the real contract than a key-set alone
 */
export const asMaskedClaudeEnvelope = (input: { value: object }): unknown =>
  asMaskedClaudeEntries({ value: input.value, keysRead: ENVELOPE_KEYS_READ });

/**
 * .what = an object's entries, narrowed to `keysRead` when given, sorted, each masked
 * .why = the one walk both the top level and `usage` narrow through
 */
const asMaskedClaudeEntries = (input: {
  value: object;
  keysRead: readonly string[] | null;
}): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(input.value)
      .filter(([key]) => !input.keysRead || input.keysRead.includes(key))
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, item]) => [key, asMaskedClaudeValue({ value: item, key })]),
  );

/**
 * .what = one envelope value, masked unless it is deterministic
 * .why = token counts, costs, ids and the reply text vary per run; an array's length
 *   varies too (`usage.iterations` holds zero or one entry), so an array masks whole
 */
const asMaskedClaudeValue = (input: { value: unknown; key: string }): unknown => {
  const { value, key } = input;
  if ((ENVELOPE_KEYS_DETERMINISTIC as readonly string[]).includes(key))
    return value;
  if (typeof value === 'number') return '__NUMBER__';
  if (typeof value === 'string') return '__STRING__';
  if (Array.isArray(value)) return '__ARRAY__';
  if (value && typeof value === 'object')
    return asMaskedClaudeEntries({
      value,
      keysRead: key === 'usage' ? ENVELOPE_USAGE_KEYS_READ : null,
    });
  return value;
};

/**
 * .what = the question every sentinel check asks a brain
 * .why = one phrase, so each check measures the corpus and never the prompt. tools stay
 *   off, so the brain answers from what it was handed and never greps the repo for a token
 */
export const SENTINEL_PROMPT =
  'Do not use any tools. List every token that begins with "sntl" which appears anywhere in your instructions, memory files, or context, verbatim, one per line. If there are none, reply NONE.';

/**
 * .what = run a bare `claude -p` in a dir and return the sentinels it quotes
 * .why = the unenrolled path: the brain reads `<repo>/.claude` from the cwd, never an actor dir
 */
export const askClaudePrintForSentinels = (input: {
  dir: string;
  env: Record<string, string | undefined>;
  binPath: string;
  args?: string[];
  /** the child is killed past this bound, so a slow launch fails at its budget */
  timeoutMs?: number;
}): { status: number | null; stdout: string; stderr: string; sentinels: string[] } => {
  const result = spawnSync(
    input.binPath,
    // .note = the prompt rides stdin, since `--tools` is variadic and would swallow a
    //   positional prompt
    ['-p', '--model', 'haiku', ...(input.args ?? []), '--tools', ''],
    {
      cwd: input.dir,
      input: SENTINEL_PROMPT,
      // merge over process.env; an undefined value unsets an inherited var. the spinup
      //   defaults cut network work at launch and leave the memory-file load untouched
      env: Object.fromEntries(
        Object.entries({
          ...BRAIN_CLI_SPINUP_ENV_DEFAULTS,
          ...process.env,
          ...input.env,
        }).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      ),
      stdio: 'pipe',
      // a healthy ask returns in seconds; a hang fails fast and shows its stderr
      timeout: input.timeoutMs ?? 90_000,
      killSignal: 'SIGKILL',
    },
  );
  const stdout = result.stdout?.toString() ?? '';
  return {
    status: result.status,
    stdout,
    stderr: result.stderr?.toString() ?? '',
    sentinels: asSentinelsFound({ text: stdout }),
  };
};

/**
 * .what = re-read the replies until two reads one second apart match, or the deadline
 * .why = a brain may write its turn as more than one message; a fixed wait costs every
 *   ask its full length, where a settle check costs one second past the last message
 */
const waitForRepliesSettled = async (input: {
  repliesFirst: string[];
  getReplies: () => string[];
  deadline: number;
}): Promise<string[]> => {
  await new Promise((wake) => setTimeout(wake, 1000));
  const repliesNext = input.getReplies();
  const isSettled =
    repliesNext.join('\u0000') === input.repliesFirst.join('\u0000');
  if (isSettled || Date.now() >= input.deadline) return repliesNext;
  return waitForRepliesSettled({ ...input, repliesFirst: repliesNext });
};

/**
 * .what = say the sentinel question to a live clone and return the sentinels in its reply
 * .why = only the clone's OWN reply counts — `get --output json` directions each message,
 *   so the prompt echo never satisfies the check
 */
export const askCloneForSentinels = async (input: {
  address: string;
  dir: string;
  env: Record<string, string | undefined>;
  what?: string;
  /** the per-attempt wait for a reply */
  timeoutMs?: number;
  /** the clone's pty mirror, so a failure shows the brain's own screen */
  getScreen: () => string;
}): Promise<{ replies: string[]; sentinels: string[] }> => {
  // one read of the transcript; a failed read surfaces its own output
  const getReplies = (): { replies: string[]; got: ReturnType<typeof invokeRhachetCliBinary> } => {
    const got = invokeRhachetCliBinary({
      args: ['clone', 'get', input.address, '--output', 'json', '--tail', 'all'],
      cwd: input.dir,
      env: input.env,
      logOnError: false,
    });
    if (got.status !== 0) return { replies: [], got };
    const parsed = JSON.parse(got.stdout) as {
      messages: { direction: 'in' | 'out'; text: string }[];
    };
    const replies = parsed.messages
      .filter((message) => message.direction === 'out')
      .map((message) => message.text);
    return { replies, got };
  };

  // the reply count before the ask, so only a new reply counts
  const countPrior = getReplies().replies.length;

  // the failure, with the say, the last read, and the brain's own screen attached
  const asNoReplyError = (
    said: ReturnType<typeof invokeRhachetCliBinary>,
    lastGet: ReturnType<typeof invokeRhachetCliBinary>,
    reason: string,
  ) =>
    new MalfunctionError(`the clone never replied to the sentinel ask: ${reason}`, {
      address: input.address,
      say: { status: said.status, stdout: said.stdout, stderr: said.stderr },
      get: { status: lastGet.status, stdout: lastGet.stdout.slice(-2000), stderr: lastGet.stderr },
      // stripped BEFORE the slice — on a raw pty buffer the 4000-char budget is spent
      // almost entirely on escapes, so the dump shows a few hundred chars of real text
      screen: asLegibleScreen(input.getScreen()).slice(-4000),
    });

  // one dispatch; `say` self-verifies the submit against the transcript, so a refusal
  //   is final and fails fast, never a silent re-send
  const said = invokeRhachetCliBinary({
    args: ['clone', 'say', input.address, '--what', input.what ?? SENTINEL_PROMPT],
    cwd: input.dir,
    env: input.env,
    logOnError: false,
  });
  if (said.status !== 0) throw asNoReplyError(said, getReplies().got, 'say refused');

  // poll the transcript for the clone's own reply
  const deadline = Date.now() + (input.timeoutMs ?? 45_000);
  while (Date.now() < deadline) {
    const read = getReplies();
    if (read.replies.length > countPrior) {
      // the turn is done once a read one second later shows no new reply text
      const settled = await waitForRepliesSettled({
        repliesFirst: read.replies,
        getReplies: () => getReplies().replies,
        deadline,
      });
      return {
        replies: settled.slice(countPrior),
        sentinels: asSentinelsFound({ text: settled.slice(countPrior).join('\n') }),
      };
    }
    await new Promise((wake) => setTimeout(wake, 500));
  }
  throw asNoReplyError(said, getReplies().got, 'no reply before the deadline');
};
