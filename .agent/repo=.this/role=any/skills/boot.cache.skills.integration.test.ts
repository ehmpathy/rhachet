import { spawn, spawnSync } from 'child_process';
import { MalfunctionError } from 'helpful-errors';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { given, then, useThen, when } from 'test-fns';

/**
 * .what = the help, refusal, and read paths of the two prompt-cache measure skills, snapped
 * .why = `boot.cache.probe` and `clone.cache.usage` are how a human measures the boot cache.
 *   a typo or an absent value must refuse with exit 2 and name the fix; a transcript that is
 *   no json must fail as a named malfunction; the snapshot lets a reviewer read the words
 *
 * .note = only the paths that spend no tokens are exercised. the probe's measure itself runs
 *   two real `-p` sessions, a byhand step whose figures the behavior yield records
 * .note = an integration test: it spawns bash and reads the filesystem
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SKILLS_DIR = __dirname;

/**
 * .what = an env whose PATH puts a stub dir first, with no bash function source
 * .why = a function named `npx` outranks PATH. it reaches a non-interactive bash two ways: an
 *   exported function (`BASH_FUNC_npx%%`) or a file `BASH_ENV` sources. a stub env strips both,
 *   else the real `npx` runs and spends real tokens
 */
const asStubEnv = (input: { pathPrefix: string }): NodeJS.ProcessEnv => ({
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.startsWith('BASH_FUNC_') && key !== 'BASH_ENV',
    ),
  ),
  PATH: `${input.pathPrefix}:${process.env.PATH}`,
});

/**
 * .what = run one skill with args, from the repo root (or a given dir), with the repo path masked
 */
const runSkill = (input: {
  skill: string;
  args: string[];
  pathPrefix?: string;
  cwd?: string;
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync(
    'bash',
    [join(SKILLS_DIR, `${input.skill}.sh`), ...input.args],
    {
      cwd: input.cwd ?? REPO_ROOT,
      encoding: 'utf-8',
      env: input.pathPrefix
        ? asStubEnv({ pathPrefix: input.pathPrefix })
        : process.env,
    },
  );
  // mask the repo root, and each run's timestamped log dir
  const mask = (text: string): string =>
    text
      .split(REPO_ROOT)
      .join('<repo>')
      .replace(/\/\d{8}T\d{6}Z\.\d+/g, '/<run>');
  return {
    status: result.status,
    stdout: mask(result.stdout),
    stderr: mask(result.stderr),
  };
};

/**
 * .what = fixture transcripts and clone dirs for clone.cache.usage
 * .why = the read path must be snapped with no live clone: two content blocks of one message
 *   fold to one call, so the fixture holds a split message on purpose
 */
const FIXTURE_ROOT_REL = '.temp/boot.cache.skills.test';
const TRANSCRIPT_REL = `${FIXTURE_ROOT_REL}/clone/history/session.jsonl`;
const CLONE_REL = `${FIXTURE_ROOT_REL}/clone`;
const CLONE_EMPTY_REL = `${FIXTURE_ROOT_REL}/clone-empty`;
const TRANSCRIPT_BROKEN_REL = `${FIXTURE_ROOT_REL}/broken.jsonl`;
const STUB_FAIL_REL = `${FIXTURE_ROOT_REL}/stub-fail`;
const STUB_NOREPLY_REL = `${FIXTURE_ROOT_REL}/stub-noreply`;
const STUB_REPLY_REL = `${FIXTURE_ROOT_REL}/stub-reply`;
const STUB_REFUSE_REL = `${FIXTURE_ROOT_REL}/stub-refuse`;
const STUB_OTEL_PLAIN_REL = `${FIXTURE_ROOT_REL}/stub-otel-plain`;
const STUB_OTEL_BOOTED_REL = `${FIXTURE_ROOT_REL}/stub-otel-booted`;
const NOBRIEF_REL = `${FIXTURE_ROOT_REL}/nobrief`;
const STUB_USAGE_COLD_REL = `${FIXTURE_ROOT_REL}/stub-usage-cold`;
const STUB_USAGE_WARM_REL = `${FIXTURE_ROOT_REL}/stub-usage-warm`;
const STUB_USAGE_MISS_REL = `${FIXTURE_ROOT_REL}/stub-usage-miss`;
const STUB_USAGE_DIFF_REL = `${FIXTURE_ROOT_REL}/stub-usage-diff`;
const STUB_BRAIN_ERROR_REL = `${FIXTURE_ROOT_REL}/stub-brain-error`;
const STUB_COMPACT_SAY_REFUSED_REL = `${FIXTURE_ROOT_REL}/stub-compact-say-refused`;
const STUB_COMPACT_SAY_DEAF_REL = `${FIXTURE_ROOT_REL}/stub-compact-say-deaf`;
const STUB_RESUME_HELD_REL = `${FIXTURE_ROOT_REL}/stub-resume-held`;
const STUB_RESUME_PLAIN_REL = `${FIXTURE_ROOT_REL}/stub-resume-plain`;
const STUB_COMPACT_REREAD_REL = `${FIXTURE_ROOT_REL}/stub-compact-reread`;
const STUB_COMPACT_KEPT_REL = `${FIXTURE_ROOT_REL}/stub-compact-kept`;
const STUB_RESUME_REACHES_REL = `${FIXTURE_ROOT_REL}/stub-resume-reaches`;
const STUB_RESUME_KEPT_REL = `${FIXTURE_ROOT_REL}/stub-resume-kept`;
const STUB_OTEL_SPLIT_REL = `${FIXTURE_ROOT_REL}/stub-otel-split`;
const STUB_USAGE_EQUAL_REL = `${FIXTURE_ROOT_REL}/stub-usage-equal`;
const STUB_USAGE_NOTJSON_REL = `${FIXTURE_ROOT_REL}/stub-usage-notjson`;
const STUB_INDEX_NOTJSON_REL = `${FIXTURE_ROOT_REL}/stub-index-notjson`;
const STUB_REPLY_OFFBRIEF_REL = `${FIXTURE_ROOT_REL}/stub-reply-offbrief`;
const COMPACT_TREE_REL = `${FIXTURE_ROOT_REL}/compact-tree`;
const RESUME_TREE_REL = `${FIXTURE_ROOT_REL}/resume-tree`;

/**
 * .what = a stub `npx` body for boot.compact.probe: the enroll writes a clone of the probe slug,
 *   and each say but `/exit` exits with the given code
 * .why = the probe finds its clone by the slug in identity.json, so the stub writes one there, in
 *   the cwd's own `.agent/.actors`, never the repo's
 */
const asStubCompactBody = (input: { sayExit: number }): string =>
  [
    'if [[ "$1 $2" == "rhx enroll" ]]; then',
    '  slug=""; prev=""',
    '  for a in "$@"; do [[ "$prev" == "--as" ]] && slug="${a#@:}"; prev="$a"; done',
    '  actor=".agent/.actors/actor.via.hash=stub"',
    '  mkdir -p "$actor/clones/serial=$slug" "$actor/brain/.claude"',
    `  printf '{"serial":"%s","slug":"%s"}' "$slug" "$slug" > "$actor/clones/serial=$slug/identity.json"`,
    `  printf 'a boot\\n' > "$actor/brain/.claude/boot.md"`,
    '  exit 0',
    'fi',
    '[[ "$*" == *"--what /exit"* ]] && exit 0',
    'echo "the say did not land" >&2',
    `exit ${input.sayExit}`,
  ].join('\n');

/**
 * .what = a stub `npx` body for a whole boot.compact.probe run: the enroll writes a clone of the
 *   probe slug and keeps its otel dir; each say logs one raw request whose system block is the
 *   boot the stub chooses
 * .why = `reread` sends the boot.md of the moment (so the request after /compact holds the edit),
 *   `kept` sends the boot.md of spawn; the two verdicts of the probe follow
 */
const asStubCompactRunBody = (input: { boot: 'reread' | 'kept' }): string =>
  [
    'actor=".agent/.actors/actor.via.hash=stub"',
    'if [[ "$1 $2" == "rhx enroll" ]]; then',
    '  slug=""; prev=""',
    '  for a in "$@"; do [[ "$prev" == "--as" ]] && slug="${a#@:}"; prev="$a"; done',
    '  mkdir -p "$actor/clones/serial=$slug" "$actor/brain/.claude"',
    `  printf '{"serial":"%s","slug":"%s"}' "$slug" "$slug" > "$actor/clones/serial=$slug/identity.json"`,
    `  printf 'a boot\\n' > "$actor/brain/.claude/boot.md"`,
    '  cp "$actor/brain/.claude/boot.md" "$actor/brain/.claude/boot.md.spawn"',
    `  printf '%s' "\${OTEL_LOG_RAW_API_BODIES#file:}" > "$actor/clones/serial=$slug/otel.dir"`,
    '  exit 0',
    'fi',
    '[[ "$*" == *"--what /exit"* ]] && exit 0',
    'slug="${4#@:}"',
    'dir="$(cat "$actor/clones/serial=$slug/otel.dir")"',
    'what=""; prev=""',
    'for a in "$@"; do [[ "$prev" == "--what" ]] && what="$a"; prev="$a"; done',
    'n=1',
    '[[ -f "$dir/index.jsonl" ]] && n=$(( $(awk NF "$dir/index.jsonl" | wc -l) + 1 ))',
    `system="$(tr '\\n' ' ' < "$actor/brain/.claude/boot.md${input.boot === 'kept' ? '.spawn' : ''}")"`,
    `printf '{"system":"%s","messages":[{"role":"user","content":"%s"}]}' "$system" "$what" > "$dir/r$n.json"`,
    `printf '{"request_file":"r%s.json"}\\n' "$n" >> "$dir/index.jsonl"`,
  ].join('\n');

/**
 * .what = a stub `npx` body for a whole boot.resume.probe run: the resume turn renders a boot.md
 *   that holds the run's sentinel; `reaches` also sends it in the resumed request
 * .why = the probe's premise (the spawn's boot.md holds the edit) holds in both, so the two
 *   verdicts differ only by what the resumed request carries
 */
const asStubResumeRunBody = (input: { resumed: 'reaches' | 'kept' }): string =>
  [
    'dir="${OTEL_LOG_RAW_API_BODIES#file:}"',
    'mkdir -p "$dir"',
    'run="$(basename "$(dirname "$dir")")"',
    'sentinel="REEF-${run##*.}-SWELL"',
    'system="a boot"',
    'if [[ "$*" == *--resume* ]]; then',
    '  mkdir -p .agent/.actors/actor.via.hash=stub/brain/.claude',
    `  printf 'a boot that holds %s\\n' "$sentinel" > .agent/.actors/actor.via.hash=stub/brain/.claude/boot.md`,
    input.resumed === 'reaches' ? '  system="a boot that holds $sentinel"' : '  :',
    'fi',
    `printf '{"system":"%s"}' "$system" > "$dir/r1.json"`,
    `printf '%s\\n' '{"request_file":"r1.json"}' > "$dir/index.jsonl"`,
    `echo '{"type":"result","result":"OK","session_id":"sess-1"}'`,
  ].join('\n');

/**
 * .what = a stub `npx` body for boot.resume.probe: each turn logs one raw request and names a
 *   session; `held` puts the run's sentinel in the system block of every turn
 * .why = the sentinel is `REEF-<pid>-SWELL`, and the pid ends the run dir the otel path sits in,
 *   so the stub reads it from there, with no reach into the probe's process
 */
const asStubResumeBody = (input: { held: boolean }): string =>
  [
    'dir="${OTEL_LOG_RAW_API_BODIES#file:}"',
    'mkdir -p "$dir"',
    'run="$(basename "$(dirname "$dir")")"',
    `system="a boot${input.held ? ' that holds REEF-${run##*.}-SWELL' : ''}"`,
    `printf '{"system":"%s"}' "$system" > "$dir/r1.json"`,
    `printf '%s\\n' '{"request_file":"r1.json"}' > "$dir/index.jsonl"`,
    `echo '{"type":"result","result":"OK","session_id":"sess-1"}'`,
  ].join('\n');

/**
 * .what = a stub `npx` body that logs one raw request whose system block is given, then a reply
 * .why = the subagent probe reads the raw request log; a stub stands in for the brain-cli's own
 *   `OTEL_LOG_RAW_API_BODIES=file:<dir>` write
 */
const asStubOtelBody = (input: { system: string }): string =>
  [
    'dir="${OTEL_LOG_RAW_API_BODIES#file:}"',
    'mkdir -p "$dir"',
    `printf '%s' '${JSON.stringify({ system: input.system })}' > "$dir/r1.json"`,
    `printf '%s\\n' '{"request_file":"r1.json"}' > "$dir/index.jsonl"`,
    `echo '{"type":"result","result":"DONE"}'`,
  ].join('\n');
beforeAll(() => {
  const root = join(REPO_ROOT, FIXTURE_ROOT_REL);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(join(REPO_ROOT, CLONE_REL, 'history'), { recursive: true });
  mkdirSync(join(REPO_ROOT, CLONE_EMPTY_REL, 'history'), { recursive: true });
  const usageOf = (input: { fresh: number; write: number; read: number }) => ({
    input_tokens: input.fresh,
    cache_creation_input_tokens: input.write,
    cache_read_input_tokens: input.read,
  });
  // .note = the ids run against their lexical order (`msg_z` before `msg_a`), so a read that
  //   sorts by id would show the calls out of turn; a `<synthetic>` row is no api call
  const rows = [
    {
      type: 'assistant',
      message: { id: 'msg_syn', model: '<synthetic>', usage: usageOf({ fresh: 0, write: 0, read: 0 }) },
    },
    { type: 'user', message: { content: 'hi' } },
    {
      type: 'assistant',
      message: { id: 'msg_z', usage: usageOf({ fresh: 10, write: 4800, read: 132111 }) },
    },
    {
      type: 'assistant',
      message: { id: 'msg_z', usage: usageOf({ fresh: 10, write: 4800, read: 132111 }) },
    },
    {
      type: 'assistant',
      message: { id: 'msg_a', usage: usageOf({ fresh: 3, write: 120, read: 136911 }) },
    },
  ];
  writeFileSync(
    join(REPO_ROOT, TRANSCRIPT_REL),
    `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`,
  );
  writeFileSync(join(REPO_ROOT, TRANSCRIPT_BROKEN_REL), '{"type":"assistant",\n');

  // stub `npx` dirs for boot.adherence.probe: each stands in for one shape of a trial
  const stubOf = (input: { dir: string; body: string }) => {
    mkdirSync(join(REPO_ROOT, input.dir), { recursive: true });
    writeFileSync(join(REPO_ROOT, input.dir, 'npx'), `#!/usr/bin/env bash\n${input.body}\n`, {
      mode: 0o755,
    });
  };
  stubOf({ dir: STUB_FAIL_REL, body: 'echo "enroll refused" >&2; exit 3' });
  stubOf({ dir: STUB_NOREPLY_REL, body: 'echo "not json"' });
  stubOf({ dir: STUB_REFUSE_REL, body: 'echo "bad --roles spec" >&2; exit 2' });
  stubOf({
    dir: STUB_OTEL_PLAIN_REL,
    body: asStubOtelBody({ system: 'a vendor prompt and no boot' }),
  });
  stubOf({
    dir: STUB_OTEL_BOOTED_REL,
    body: asStubOtelBody({ system: '<brief.say path="x">a boot</brief.say>' }),
  });
  // stub `npx` dirs for boot.cache.probe's verdict: the second run's prompt holds YES
  const asUsageReply = (input: { write: number; read: number }): string =>
    `echo '${JSON.stringify({
      type: 'result',
      result: 'OK',
      usage: {
        input_tokens: 10,
        cache_creation_input_tokens: input.write,
        cache_read_input_tokens: input.read,
      },
    })}'`;
  stubOf({
    dir: STUB_USAGE_COLD_REL,
    body: `if [[ "$*" == *YES* ]]; then ${asUsageReply({ write: 4805, read: 132295 })}; else ${asUsageReply({ write: 137100, read: 0 })}; fi`,
  });
  stubOf({
    dir: STUB_USAGE_WARM_REL,
    body: asUsageReply({ write: 4805, read: 132295 }),
  });
  stubOf({
    dir: STUB_USAGE_MISS_REL,
    body: asUsageReply({ write: 137100, read: 0 }),
  });
  // a stub that logs a raw request whose system block is shared and whose first message holds
  //   the prompt, so two runs differ only after the boot (the --diff path)
  stubOf({
    dir: STUB_USAGE_DIFF_REL,
    body: [
      'dir="${OTEL_LOG_RAW_API_BODIES#file:}"',
      'mkdir -p "$dir"',
      'prompt="OK"; [[ "$*" == *YES* ]] && prompt="YES"',
      `printf '{"messages":[{"role":"user","content":[{"type":"text","text":"%s"}]}],"system":[{"type":"text","text":"<brief.say path=\\\\"x\\\\">a boot</brief.say>","cache_control":{"type":"ephemeral"}}]}' "$prompt" > "$dir/r1.json"`,
      `printf '%s\\n' '{"request_file":"r1.json"}' > "$dir/index.jsonl"`,
      asUsageReply({ write: 4805, read: 132295 }),
    ].join('\n'),
  });
  stubOf({
    dir: STUB_BRAIN_ERROR_REL,
    body: `echo '{"type":"result","is_error":true,"result":"the api refused the request"}'`,
  });
  stubOf({ dir: STUB_COMPACT_SAY_REFUSED_REL, body: asStubCompactBody({ sayExit: 2 }) });
  stubOf({ dir: STUB_COMPACT_SAY_DEAF_REL, body: asStubCompactBody({ sayExit: 1 }) });
  stubOf({ dir: STUB_RESUME_HELD_REL, body: asStubResumeBody({ held: true }) });
  stubOf({ dir: STUB_RESUME_PLAIN_REL, body: asStubResumeBody({ held: false }) });
  stubOf({ dir: STUB_COMPACT_REREAD_REL, body: asStubCompactRunBody({ boot: 'reread' }) });
  stubOf({ dir: STUB_COMPACT_KEPT_REL, body: asStubCompactRunBody({ boot: 'kept' }) });
  stubOf({ dir: STUB_RESUME_REACHES_REL, body: asStubResumeRunBody({ resumed: 'reaches' }) });
  stubOf({ dir: STUB_RESUME_KEPT_REL, body: asStubResumeRunBody({ resumed: 'kept' }) });
  // a turn whose first request carries the boot and whose second is a subagent's own prompt
  stubOf({
    dir: STUB_OTEL_SPLIT_REL,
    body: [
      'dir="${OTEL_LOG_RAW_API_BODIES#file:}"',
      'mkdir -p "$dir"',
      `printf '%s' '${JSON.stringify({ system: '<brief.say path="x">a boot</brief.say>' })}' > "$dir/r1.json"`,
      `printf '%s' '${JSON.stringify({ system: 'a subagent prompt' })}' > "$dir/r2.json"`,
      `printf '%s\\n%s\\n' '{"request_file":"r1.json"}' '{"request_file":"r2.json"}' > "$dir/index.jsonl"`,
      `echo '{"type":"result","result":"DONE"}'`,
    ].join('\n'),
  });
  // two runs whose raw requests are byte-equal: the prompt rides no logged body
  stubOf({
    dir: STUB_USAGE_EQUAL_REL,
    body: [
      'dir="${OTEL_LOG_RAW_API_BODIES#file:}"',
      'mkdir -p "$dir"',
      `printf '%s' '${JSON.stringify({ system: [{ type: 'text', text: 'a boot' }] })}' > "$dir/r1.json"`,
      `printf '%s\\n' '{"request_file":"r1.json"}' > "$dir/index.jsonl"`,
      asUsageReply({ write: 4805, read: 132295 }),
    ].join('\n'),
  });
  // a raw request body that is no json
  stubOf({
    dir: STUB_USAGE_NOTJSON_REL,
    body: [
      'dir="${OTEL_LOG_RAW_API_BODIES#file:}"',
      'mkdir -p "$dir"',
      `printf 'not json' > "$dir/r1.json"`,
      `printf '%s\\n' '{"request_file":"r1.json"}' > "$dir/index.jsonl"`,
      asUsageReply({ write: 4805, read: 132295 }),
    ].join('\n'),
  });
  // a raw request index whose first row is no json: the read must fail loud, never read as absent
  stubOf({
    dir: STUB_INDEX_NOTJSON_REL,
    body: [
      'dir="${OTEL_LOG_RAW_API_BODIES#file:}"',
      'mkdir -p "$dir"',
      `printf '%s' '{"system":"a boot"}' > "$dir/r1.json"`,
      `printf '%s\\n' 'not a row' > "$dir/index.jsonl"`,
      asUsageReply({ write: 4805, read: 132295 }),
    ].join('\n'),
  });
  stubOf({
    dir: STUB_REPLY_OFFBRIEF_REL,
    body: `echo '{"type":"result","result":"hi there"}'`,
  });
  mkdirSync(join(REPO_ROOT, COMPACT_TREE_REL), { recursive: true });
  // the resume probe edits one brief by its repo path, so its tree holds that brief alone
  const resumeBriefDir = join(REPO_ROOT, RESUME_TREE_REL, '.agent/repo=.this/role=any/briefs');
  mkdirSync(resumeBriefDir, { recursive: true });
  writeFileSync(join(resumeBriefDir, 'run.executable.lookup.pattern.md.min'), '# a brief\n');
  mkdirSync(join(REPO_ROOT, NOBRIEF_REL), { recursive: true });
  stubOf({
    dir: STUB_REPLY_REL,
    body: `echo '{"type":"result","result":"hi 🧮 there"}'`,
  });

  // fail fast unless bash resolves `npx` to the stub: a miss would spend real tokens
  const stubDir = join(REPO_ROOT, STUB_REPLY_REL);
  const resolved = spawnSync('bash', ['-c', 'type -a npx | head -n 1'], {
    cwd: REPO_ROOT,
    env: asStubEnv({ pathPrefix: stubDir }),
  })
    .stdout.toString()
    .trim();
  if (!resolved.includes(stubDir))
    throw new MalfunctionError('the stub npx does not win the lookup in bash', {
      resolved,
      stubDir,
    });
});

describe('boot.cache.skills', () => {
  given('[case1] boot.cache.probe', () => {
    when('[t0] help is asked', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.cache.probe', args: ['help'] }),
      );

      then('it exits 0 and names every option', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('--across');
        expect(result.stdout).toContain('--diff');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] --across holds a value outside its set', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.cache.probe', args: ['--across', 'bogus'] }),
      );

      then('it refuses with exit 2 and names the valid set', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: invalid --across value bogus');
        expect(result.stderr).toContain('tree or worktree');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] --roles has no value', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.cache.probe', args: ['--roles'] }),
      );

      then('it refuses with exit 2 and names the flag', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('absent value for --roles');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t3] an unknown argument is passed', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.cache.probe', args: ['--bogus'] }),
      );

      then('it refuses with exit 2, never drops it', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('unknown argument --bogus');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t4] a probe clone exits nonzero', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_FAIL_REL),
        }),
      );

      then('it fails as a named malfunction with exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError:');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t5] a probe clone returns no result json', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_NOREPLY_REL),
        }),
      );

      then('it fails as a named malfunction with exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError:');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t6] the first run writes the boot and the second reads it', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_USAGE_COLD_REL),
        }),
      );

      then('it exits 0 with a ✓ verdict, and no warm-first-run note', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('✓ the second session read the boot from cache');
        expect(result.stdout).not.toContain('the first run read the boot too');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t7] both runs read the boot, since an earlier session wrote it', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_USAGE_WARM_REL),
        }),
      );

      then('it exits 0 with a ✓ verdict, and names why the first run read', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('✓ the second session read the boot from cache');
        expect(result.stdout).toContain('the first run read the boot too');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t8] both runs write the boot', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_USAGE_MISS_REL),
        }),
      );

      then('it exits 0 with a ✗ verdict: a miss is a measure, not a fault', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('✗ the second session did not read the boot from cache');
        expect(result.stdout).not.toContain('the first run read the boot too');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t9] --diff, and the two requests differ only in the first message', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: ['--diff'],
          pathPrefix: join(REPO_ROOT, STUB_USAGE_DIFF_REL),
        }),
      );

      then('it names the first byte that differs, and that it lies after the boot', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('of the request file');
        expect(result.stdout).toContain(
          'in messages, after the boot, so the boot prefix is still shared',
        );
        expect(result.stdout.replace(/\/(?:[0-9a-f-]+\.request\.json|r1\.json)/g, '/<body>')).toMatchSnapshot();
      });
    });

    when('[t10] a probe enroll refuses its args (exit 2)', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_REFUSE_REL),
        }),
      );

      then('it refuses as a named constraint with exit 2, never a malfunction', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          '✋ ConstraintError: a probe enroll refused its args, in this tree',
        );
        expect(result.stderr).toContain('bad --roles spec');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t11] a probe brain returns an error result', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_BRAIN_ERROR_REL),
        }),
      );

      then('it fails as a named malfunction with the brain text', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: a probe brain returned an error, not a measure',
        );
        expect(result.stderr).toContain('the api refused the request');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t12] a probe result holds no usage figures', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_REPLY_REL),
        }),
      );

      then('it fails as a named malfunction: a partial usage is no measure', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: a probe result held no usage figures',
        );
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t13] --diff, and the two raw requests are byte-equal', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: ['--diff'],
          pathPrefix: join(REPO_ROOT, STUB_USAGE_EQUAL_REL),
        }),
      );

      then('it names the bodies byte-equal, read off cmp, never off a silent fault', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('└─ byte-equal');
        expect(result.stdout).not.toContain('first byte that differs');
        expect(result.stdout.replace(/\/r1\.json/g, '/<body>')).toMatchSnapshot();
      });
    });

    when('[t14] --diff, and a raw request body is no json', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: ['--diff'],
          pathPrefix: join(REPO_ROOT, STUB_USAGE_NOTJSON_REL),
        }),
      );

      then('it fails as a named malfunction, never a verdict', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: a raw request body is not a json object',
        );
        expect(result.stdout).not.toContain('byte-equal');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t16] --diff, and a raw request index row is no json', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: ['--diff'],
          pathPrefix: join(REPO_ROOT, STUB_INDEX_NOTJSON_REL),
        }),
      );

      then('it fails as a named malfunction, never as absent bodies or a verdict', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          'could not be parsed as json',
        );
        expect(result.stderr).not.toContain('found no raw request bodies');
        expect(result.stdout).not.toContain('byte-equal');
        // the detail rows quote jq's own error text, which varies by jq version: mask each
        //   row to one stable token, so the snap keeps the detail branch and its shape
        const stderrMasked = result.stderr
          .split('\n')
          .map((line) =>
            line.startsWith('   │  │') ? '   │  │ <jq error text>' : line,
          )
          .filter(
            (line, index, lines) =>
              !(line === '   │  │ <jq error text>' && lines[index - 1] === line),
          )
          .join('\n');
        expect(stderrMasked).toContain('   ├─ detail\n   │  │ <jq error text>');
        expect(stderrMasked).toMatchSnapshot();
      });
    });

    when('[t15] --across worktree, the second run in a temp worktree of HEAD', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.cache.probe',
          args: ['--across', 'worktree'],
          pathPrefix: join(REPO_ROOT, STUB_USAGE_COLD_REL),
        }),
      );

      then('it exits 0, names the other path, and gives the verdict', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain(
          'the second run starts in a temp worktree of HEAD, at another path',
        );
        expect(result.stdout).toContain('✓ the second session read the boot from cache');
        expect(result.stdout).toMatchSnapshot();
      });

      then('a clean run leaves no temp worktree behind', () => {
        const listed = spawnSync('git', ['worktree', 'list'], {
          cwd: REPO_ROOT,
          encoding: 'utf-8',
        });
        expect(listed.stdout).not.toContain('.temp/boot.cache.probe/');
      });
    });
  });

  given('[case3] boot.compact.probe', () => {
    when('[t0] help is asked', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.compact.probe', args: ['help'] }),
      );

      then('it exits 0 and names every option', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('--roles');
        expect(result.stdout).toContain('--model');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] --model has no value', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.compact.probe', args: ['--model'] }),
      );

      then('it refuses with exit 2 before any clone spawns', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('absent value for --model');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] an unknown argument is passed', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.compact.probe', args: ['--bogus'] }),
      );

      then('it refuses with exit 2, never drops it', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('unknown argument --bogus');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t3] the probe clone exits nonzero', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.compact.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_FAIL_REL),
        }),
      );

      then('it fails as a named malfunction with exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError:');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t4] the enroll succeeds and no clone of the probe slug is on disk', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.compact.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_REPLY_REL),
        }),
      );

      then('it fails as a named malfunction: the actor boot.md is not found', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          "💥 MalfunctionError: the probe clone's actor boot.md could not be found",
        );
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t5] the probe enroll refuses its args (exit 2)', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.compact.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_REFUSE_REL),
        }),
      );

      then('it refuses as a named constraint with exit 2, never a malfunction', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: the probe enroll refused its args');
        expect(result.stderr).toContain('bad --roles spec');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t6] the clone is found and its first say is refused (exit 2)', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.compact.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_COMPACT_SAY_REFUSED_REL),
          cwd: join(REPO_ROOT, COMPACT_TREE_REL),
        }),
      );

      then('it refuses as a named constraint that names the turn', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: the say of turn 1 was refused');
        expect(result.stderr).toContain('the say did not land');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t7] the clone is found and its first say does not reach it (exit 1)', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.compact.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_COMPACT_SAY_DEAF_REL),
          cwd: join(REPO_ROOT, COMPACT_TREE_REL),
        }),
      );

      then('it fails as a named malfunction that names the turn and the exit', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: the say of turn 1 did not reach the clone, exit 1',
        );
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t8] the request after /compact holds the edit', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.compact.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_COMPACT_REREAD_REL),
          cwd: join(REPO_ROOT, COMPACT_TREE_REL),
        }),
      );

      then('it exits 0 with the ✓ verdict, each request in send order', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('[3] turn 2 · system holds the sentinel = yes');
        expect(result.stdout).toContain('✓ /compact re-read the boot');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t9] the request after /compact holds the spawn boot', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.compact.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_COMPACT_KEPT_REL),
          cwd: join(REPO_ROOT, COMPACT_TREE_REL),
        }),
      );

      then('it exits 0 with the ✗ verdict: a kept boot is a measure, not a fault', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('[3] turn 2 · system holds the sentinel = no');
        expect(result.stdout).toContain('✗ /compact kept the spawn boot');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] boot.adherence.probe', () => {
    const ASK = ['--prompt', 'say hi', '--expect', '🧮'];

    when('[t0] help is asked', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.adherence.probe', args: ['help'] }),
      );

      then('it exits 0 and names every option', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('--trials');
        expect(result.stdout).toContain('--expect');
        expect(result.stdout).not.toContain('🐢');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] --trials is no positive integer', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.adherence.probe', args: [...ASK, '--trials', '0'] }),
      );

      then('it refuses with exit 2 and shows a valid form', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('invalid --trials value 0');
        expect(result.stderr).toContain('--trials 5');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] --prompt has no value', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.adherence.probe', args: ['--prompt'] }),
      );

      then('it refuses with exit 2 and names the flag', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('absent value for --prompt');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t3] --expect is absent', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.adherence.probe', args: ['--prompt', 'say hi'] }),
      );

      then('it refuses with exit 2 and names both required flags', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--prompt and --expect are both required');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t4] an unknown argument is passed', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.adherence.probe', args: ['--bogus'] }),
      );

      then('it refuses with exit 2, never drops it', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('unknown argument --bogus');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t5] a trial exits nonzero', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.adherence.probe',
          args: [...ASK, '--trials', '1'],
          pathPrefix: join(REPO_ROOT, STUB_FAIL_REL),
        }),
      );

      then('it fails as a named malfunction with exit 1 and the trial output', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: trial 1 failed, exit 3');
        expect(result.stderr).toContain('enroll refused');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t6] a trial returns no result json', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.adherence.probe',
          args: [...ASK, '--trials', '1'],
          pathPrefix: join(REPO_ROOT, STUB_NOREPLY_REL),
        }),
      );

      then('it fails as a named malfunction with exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: trial 1 returned no reply');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t8] a trial enroll refuses its args (exit 2)', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.adherence.probe',
          args: [...ASK, '--trials', '1'],
          pathPrefix: join(REPO_ROOT, STUB_REFUSE_REL),
        }),
      );

      then('it refuses as a named constraint with exit 2, never a malfunction', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: trial 1 enroll refused its args');
        expect(result.stderr).toContain('bad --roles spec');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t7] each trial returns a reply that holds the text', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.adherence.probe',
          args: [...ASK, '--trials', '2'],
          pathPrefix: join(REPO_ROOT, STUB_REPLY_REL),
        }),
      );

      then('it counts each adherent reply', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('2 of 2 replies hold the expected text');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t9] no trial reply holds the text', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.adherence.probe',
          args: [...ASK, '--trials', '2'],
          pathPrefix: join(REPO_ROOT, STUB_REPLY_OFFBRIEF_REL),
        }),
      );

      then('it exits 0 and counts none: a miss is a measure, not a fault', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('0 of 2 replies hold the expected text');
        expect(result.stdout).toContain('✗');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] boot.resume.probe', () => {
    when('[t0] help is asked', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.resume.probe', args: ['help'] }),
      );

      then('it exits 0 and names every option', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('--roles');
        expect(result.stdout).toContain('--model');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] --model has no value', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.resume.probe', args: ['--model'] }),
      );

      then('it refuses with exit 2 before any turn', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('absent value for --model');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] an unknown argument is passed', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.resume.probe', args: ['--bogus'] }),
      );

      then('it refuses with exit 2, never drops it', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('unknown argument --bogus');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t3] the first turn exits nonzero', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.resume.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_FAIL_REL),
        }),
      );

      then('it fails as a named malfunction with exit 1 and the turn output', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: a probe turn failed, exit 3');
        expect(result.stderr).toContain('enroll refused');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t4] the first turn returns no result json', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.resume.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_NOREPLY_REL),
        }),
      );

      then('it fails as a named malfunction with exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: a probe turn returned no result json');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t5] it runs where the sentinel brief is absent', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.resume.probe',
          args: [],
          cwd: join(REPO_ROOT, NOBRIEF_REL),
        }),
      );

      then('it refuses with exit 2 before any turn, and names the fix', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: the sentinel brief is absent');
        expect(result.stderr).toContain('run from the repo root');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t6] the first turn enroll refuses its args (exit 2)', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.resume.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_REFUSE_REL),
          cwd: join(REPO_ROOT, RESUME_TREE_REL),
        }),
      );

      then('it refuses as a named constraint with exit 2, never a malfunction', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: a probe enroll refused its args');
        expect(result.stderr).toContain('bad --roles spec');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t7] the first turn names no session_id', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.resume.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_REPLY_REL),
          cwd: join(REPO_ROOT, RESUME_TREE_REL),
        }),
      );

      then('it fails as a named malfunction: no session to resume', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: turn 1 named no session_id');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t8] the first turn already holds the sentinel', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.resume.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_RESUME_HELD_REL),
          cwd: join(REPO_ROOT, RESUME_TREE_REL),
        }),
      );

      then('it fails as a named malfunction: the measure is void', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: turn 1 already held the sentinel, so the resume measure is void',
        );
        expect(result.stdout).toEqual('');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t9] the boot the resume spawned with lacks the brief edit', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.resume.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_RESUME_PLAIN_REL),
          cwd: join(REPO_ROOT, RESUME_TREE_REL),
        }),
      );

      then('it fails as a named malfunction that names the brief to check', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: the render at the resume spawn did not carry the brief edit',
        );
        expect(result.stderr).toContain('run.executable.lookup.pattern.md.min');
        expect(result.stdout).toEqual('');
        expect(result.stderr).toMatchSnapshot();
      });

      then('the brief is put back as it was', () => {
        expect(
          readFileSync(
            join(
              REPO_ROOT,
              RESUME_TREE_REL,
              '.agent/repo=.this/role=any/briefs/run.executable.lookup.pattern.md.min',
            ),
            'utf-8',
          ),
        ).toEqual('# a brief\n');
      });
    });

    when('[t10] the resumed request carries the edit', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.resume.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_RESUME_REACHES_REL),
          cwd: join(REPO_ROOT, RESUME_TREE_REL),
        }),
      );

      then('it exits 0 with the ✓ verdict', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('resumed turn · system holds the sentinel = yes');
        expect(result.stdout).toContain('✓ a resume sends the boot of today');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t11] the resumed request carries the boot it first recorded', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.resume.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_RESUME_KEPT_REL),
          cwd: join(REPO_ROOT, RESUME_TREE_REL),
        }),
      );

      then('it exits 0 with the ✗ verdict: a kept boot is a measure, not a fault', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('resumed turn · system holds the sentinel = no');
        expect(result.stdout).toContain('✗ a resume sends the boot the session first recorded');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case6] boot.subagent.probe', () => {
    when('[t0] help is asked', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.subagent.probe', args: ['help'] }),
      );

      then('it exits 0 and names every option', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('--roles');
        expect(result.stdout).toContain('--model');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] --roles has no value', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.subagent.probe', args: ['--roles'] }),
      );

      then('it refuses with exit 2 before any turn', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('absent value for --roles');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] an unknown argument is passed', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'boot.subagent.probe', args: ['--bogus'] }),
      );

      then('it refuses with exit 2, never drops it', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('unknown argument --bogus');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t3] the turn exits nonzero', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.subagent.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_FAIL_REL),
        }),
      );

      then('it fails as a named malfunction with exit 1 and the turn output', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: the probe turn failed, exit 3');
        expect(result.stderr).toContain('enroll refused');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t4] the turn writes no raw request bodies', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.subagent.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_REPLY_REL),
        }),
      );

      then('it fails as a named malfunction with exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: no raw request bodies under');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t5] no request carries the boot', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.subagent.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_OTEL_PLAIN_REL),
        }),
      );

      then('it fails as a named malfunction: the clone turn is absent', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          "💥 MalfunctionError: no request carried the boot, so the clone's own turn is absent",
        );
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t6] every request carries the boot', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.subagent.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_OTEL_BOOTED_REL),
        }),
      );

      then('it fails as a named malfunction: no subagent request was told apart', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: every request carried the boot, so no subagent request was told apart',
        );
        expect(result.stdout).toEqual('');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t7] one request carries the boot and the subagent request does not', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'boot.subagent.probe',
          args: [],
          pathPrefix: join(REPO_ROOT, STUB_OTEL_SPLIT_REL),
        }),
      );

      then('it exits 0 and counts each side', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('1 request(s) carry the boot, 1 do not');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case7] each skill, reached through the rhx dispatcher a human types', () => {
    const SKILLS = [
      'boot.cache.probe',
      'boot.compact.probe',
      'boot.adherence.probe',
      'boot.resume.probe',
      'boot.subagent.probe',
      'clone.cache.usage',
    ];

    when('[t0] `rhx <skill> help` is run for each', () => {
      // the six run at once: each is a cold node start, so in series they cost a minute
      const results = useThen('each runs', async () => ({
        list: await Promise.all(
          SKILLS.map(
            (skill) =>
              new Promise<{ skill: string; status: number | null; stdout: string }>(
                (settle) => {
                  const child = spawn('npx', ['rhx', skill, 'help'], { cwd: REPO_ROOT });
                  // .note = deliberate mutation: a stream accumulator, local to this one child
                  const chunks: Buffer[] = [];
                  child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
                  child.on('close', (status) =>
                    settle({ skill, status, stdout: Buffer.concat(chunks).toString() }),
                  );
                },
              ),
          ),
        ),
      }));

      then('each exits 0 and prints the help of the skill it names', () => {
        for (const result of results.list) {
          expect({ skill: result.skill, status: result.status }).toEqual({
            skill: result.skill,
            status: 0,
          });
          expect(result.stdout).toContain(`🧮 ${result.skill}`);
          expect(result.stdout).toContain('usage');
        }
      });
    });
  });

  given('[case2] clone.cache.usage', () => {
    when('[t0] help is asked', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'clone.cache.usage', args: ['help'] }),
      );

      then('it exits 0 and names every option', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('--transcript');
        expect(result.stdout).toContain('--clone');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t1] a transcript is read', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'clone.cache.usage', args: ['--transcript', TRANSCRIPT_REL] }),
      );

      then('two blocks of one message fold to one call', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('2 calls');
        expect(result.stdout).toContain('269022 cache read');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t2] a clone dir is read, first call only', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'clone.cache.usage', args: ['--clone', CLONE_REL, '--head', '1'] }),
      );

      then('it reads the clone history and stops at the head', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('1 calls');
        expect(result.stdout).toContain('132111 cache read');
        expect(result.stdout).toMatchSnapshot();
      });
    });

    when('[t3] a clone dir holds no history', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'clone.cache.usage', args: ['--clone', CLONE_EMPTY_REL] }),
      );

      then('it refuses with exit 2 and names the absent transcript', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('the clone holds no history transcript');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t4] --head is no integer', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'clone.cache.usage',
          args: ['--transcript', TRANSCRIPT_REL, '--head', 'five'],
        }),
      );

      then('it refuses with exit 2 and shows a valid form', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('invalid --head value five');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t5] a transcript path is absent on disk', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'clone.cache.usage',
          args: ['--transcript', `${FIXTURE_ROOT_REL}/absent.jsonl`],
        }),
      );

      then('it refuses with exit 2 before any tree opens', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toContain('transcript not found');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t6] a transcript holds a partial json line', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'clone.cache.usage', args: ['--transcript', TRANSCRIPT_BROKEN_REL] }),
      );

      then('it fails as a named malfunction with exit 1', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: a transcript could not be parsed as json lines',
        );
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t7] no transcript is given', () => {
      const result = useThen('it runs', () =>
        runSkill({ skill: 'clone.cache.usage', args: [] }),
      );

      then('it refuses with exit 2 and names both inputs', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--transcript <path.jsonl> or --clone <dir>');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t8] a clone dir is absent on disk', () => {
      const result = useThen('it runs', () =>
        runSkill({
          skill: 'clone.cache.usage',
          args: ['--clone', `${FIXTURE_ROOT_REL}/clone-absent`],
        }),
      );

      then('it refuses with exit 2 and names how to list the clone dirs', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: clone dir not found');
        expect(result.stderr).toContain('rhx globsafe');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });
});
