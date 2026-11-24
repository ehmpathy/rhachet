/**
 * .what = the marker that exempts one line from the rule, with its reason
 * .note = the marker must sit on the line directly above, and name a sanctioned reason
 */
export const TEMP_DIR_EXEMPT_MARKER = '.tempdir.exempt =';

/**
 * .what = the only reasons an exemption may name
 * .why = three cases cannot route through genTempDir, and each must say which it is:
 *        - a unix socket runtime dir — a socket path is capped near 108 bytes, which a
 *          genTempDir path cannot meet; the dir must be removed in afterAll
 *        - a path READ that makes no dir — e.g. a snapshot mask built from os.tmpdir()
 *        - host-wide state shared across runs on purpose — e.g. a cross-run semaphore
 *        a marker with any other reason, or none, is itself a hit
 */
export const TEMP_DIR_EXEMPT_REASONS = [
  'unix socket path cap',
  'a path read',
  'host-wide state',
] as const;

/**
 * .what = the forms of a hand-rolled test temp dir
 * .why = a dir made outside genTempDir carries no run stamp, so the autoprune
 *        teardown never reclaims it — the leak of ehmpathy/rhachet#488. the list is exactly
 *        the shapes found in this repo's test code: each form below matched a real site
 */
const HAND_ROLL_FORMS: { form: string; pattern: RegExp }[] = [
  { form: 'mkdtemp', pattern: /\bmkdtemp(Sync)?\(/ },
  { form: 'tmpdir()', pattern: /\btmpdir\(\)/ },
  // a path built on a bare '/tmp' root, e.g. join('/tmp', `x-${Date.now()}`)
  { form: "'/tmp' root", pattern: /\b(join|resolve)\(\s*['"]\/tmp\/?['"]/ },
  // a path built on a deeper '/tmp/...' root, e.g. join('/tmp/keyrack', `x-${Date.now()}`) — the
  // segments after it make it a dir built at runtime, never a static mock path
  {
    form: "'/tmp/...' root",
    pattern: /\b(join|resolve)\(\s*['"]\/tmp\/[^'"]+['"]\s*,/,
  },
  // a /tmp path minted per run (a template with an interpolation) — a static
  // '/tmp/x' string is a mock input, never made; a `.sock` is a socket file
  {
    form: "minted '/tmp/' path",
    pattern: /`\/tmp\/[^`]*\$\{[^`]*(?<!\.sock)`/,
  },
  // a /tmp path minted by concatenation, e.g. '/tmp/x-' + Date.now()
  { form: "concatenated '/tmp/' path", pattern: /['"]\/tmp\/[^'"]*['"]\s*\+/ },
  // an aliased tmpdir import, e.g. import { tmpdir as t } from 'os' — the alias would hide
  // every later call from the `tmpdir()` form
  { form: 'aliased tmpdir', pattern: /\btmpdir\s+as\s+\w+/ },
  { form: 'withTempHome', pattern: /\bwithTempHome\b/ },
];

/**
 * .what = whether a line is a comment line, where prose may name a forbidden form
 * .why = a rule that turned red on its own documentation would teach contributors to dodge it;
 *        only code can hand-roll a dir
 * .note = a line comment (`//`), a block comment's open (`/*`), or its continuation (`*`)
 */
const isCommentLine = (input: { text: string }): boolean => {
  const trimmed = input.text.trim();
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*')
  );
};

/**
 * .what = the exemption a line declares, if any: none, a sanctioned one, or an unsanctioned one
 * .why = an exemption is a claim a reviewer must be able to read and judge, so it must name one
 *        of the three sanctioned reasons; three outcomes, so a bad claim is a hit of its own
 * .note = only a COMMENT line declares one: the marker text inside a string literal is data,
 *         never a declaration
 */
const asExemption = (input: {
  text: string;
}): 'none' | 'sanctioned' | 'unsanctioned' => {
  if (!isCommentLine({ text: input.text })) return 'none';
  const at = input.text.indexOf(TEMP_DIR_EXEMPT_MARKER);
  if (at === -1) return 'none';
  const reason = input.text.slice(at + TEMP_DIR_EXEMPT_MARKER.length).trim();
  const isSanctioned = TEMP_DIR_EXEMPT_REASONS.some((sanctioned) =>
    reason.startsWith(sanctioned),
  );
  return isSanctioned ? 'sanctioned' : 'unsanctioned';
};

/**
 * .what = the hand-roll forms one line of code matches
 * .why = one line can hand-roll in two ways at once (e.g. `mkdtemp` on a `tmpdir()` path), and
 *        each form names a distinct fix, so each is reported
 */
const getAllHandRollFormsOnLine = (input: { text: string }): string[] =>
  HAND_ROLL_FORMS.filter(({ pattern }) => pattern.test(input.text)).map(
    ({ form }) => form,
  );

/**
 * .what = every hand-roll in one file, and every exempt marker with no sanctioned reason
 * .why = the marker binds only the line directly below it, so the file is read line by line
 *        with each line's neighbor above in view
 */
const getAllHandRollsInFile = (input: {
  file: { path: string; content: string };
}): { path: string; line: number; form: string; text: string }[] => {
  const lines = input.file.content.split('\n');
  return lines.flatMap((text, index) => {
    const lineNumber = index + 1;
    const lineAbove = index === 0 ? '' : lines[index - 1];
    const asHit = (form: string) => ({
      path: input.file.path,
      line: lineNumber,
      form,
      text: text.trim(),
    });

    // a marker must name a sanctioned reason, or it is a hit of its own
    if (asExemption({ text }) === 'unsanctioned')
      return [asHit('exempt marker without a sanctioned reason')];
    if (isCommentLine({ text })) return [];
    if (asExemption({ text: lineAbove ?? '' }) === 'sanctioned') return [];
    return getAllHandRollFormsOnLine({ text }).map(asHit);
  });
};

/**
 * .what = finds every hand-rolled test temp dir in the given files
 * .why = enforces that every test temp dir routes through genTempDir, so no
 *        call site can make a dir the run that made it will not reclaim
 *
 * .note = comment lines are skipped, so prose may name the forbidden forms
 */
export const getAllTempDirHandRolls = (input: {
  files: { path: string; content: string }[];
}): { path: string; line: number; form: string; text: string }[] =>
  input.files.flatMap((file) => getAllHandRollsInFile({ file }));

/**
 * .what = renders the hits as the report a contributor meets, with the fix
 * .why = this is the one message the rule speaks to the person who broke it, so it names
 *        what was found, where, and how to fix it — and is snapped so its words cannot drift
 * .note = empty when there are no hits, so a clean tree reads as `''`
 */
export const asTempDirHandRollsReport = (input: {
  found: { path: string; line: number; form: string; text: string }[];
}): string => {
  if (input.found.length === 0) return '';

  // one row per offended LINE, every form it matched beside it — the count a contributor acts on
  const rows = [...new Set(input.found.map(({ path, line }) => `${path}:${line}`))].map((at) => {
    const hits = input.found.filter(({ path, line }) => `${path}:${line}` === at);
    return `   ├─ ${at} [${hits.map(({ form }) => form).join(', ')}] ${hits[0]!.text}`;
  });

  return [
    `✋ ConstraintError: ${rows.length} ${rows.length === 1 ? 'line hand-rolls' : 'lines hand-roll'} a test temp dir — a dir made outside genTempDir is never reclaimed by its run`,
    ...rows,
    '   └─ fix = allocate via genTempDir, or genTempDirPhysical (src/.test/infra/genTempDirPhysical.ts) for a physical path;',
    `      or, for ${TEMP_DIR_EXEMPT_REASONS.join(' / ')} only, mark the line above with`,
    `      \`// ${TEMP_DIR_EXEMPT_MARKER} <reason>\` (see .agent/repo=.this/role=any/briefs/rule.require.test-tempdir-via-gentempdir.md)`,
  ].join('\n');
};
