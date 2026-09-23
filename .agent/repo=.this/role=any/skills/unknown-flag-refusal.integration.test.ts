import glob from 'fast-glob';
import { readFileSync } from 'fs';
import { join } from 'path';
import { given, then, when } from 'test-fns';

/**
 * .what = the clamp on `define.invariant.an-unknown-flag-is-refused-never-dropped`
 * .why = a silent drop is the one input defect a caller cannot detect from the output: the
 *   verb consumes the token, applies its default, exits 0, and emits a well-formed answer
 *   that is wrong. no amount of attention on the caller's part recovers it, so the bar has
 *   to be mechanical
 *
 * .note = it reads the ARGV BOUNDARY only — the `*)` arm of a `case` inside a
 *   `while [[ $# -gt 0 ]]` loop. a `case` over a variable that is not an argv token (a mode,
 *   a status) is out of scope, because a default arm there is a branch rather than a fate
 *
 * .note = it is an integration test, never a unit one: it reads the filesystem, which
 *   `rule.forbid.unit.remote-boundaries` puts outside the unit tier
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/** the argv loop's first line — the three forms bash arg parsers take */
const ARGV_LOOP_HEAD =
  /while\s+(?:\[\[\s*\$#\s*-gt\s*0\s*\]\]|\[\s*\$#\s*-gt\s*0\s*\]|\(\(\s*\$#\s*\)\))/;

/** a refusal: an exit with a non-zero code */
const REFUSES = /\bexit\s+[1-9]\d*\b/;

/**
 * a declared forward: the arm hands the token to a child rather than owns it. the invariant
 * grants `forwarded` as a first-class fate, so the clamp must be able to express it — an arm
 * that says where the token goes is not a drop
 */
const FORWARDS = /#\s*forwarded:/;

/**
 * the flags the dispatcher hands a skill that never declared them. `rhx <skill> <args>`
 * rewrites to `rhachet run --skill <skill> <args>`, and `getRawArgsAfterRun` (invokeRun.ts)
 * passes each arg after `run` to the skill — so these arrive in every skill's argv.
 *
 * ⇒ a skill whose default arm REFUSES must therefore declare them, or it refuses its own
 *   dispatcher and is unreachable via `rhx`. that is not hypothetical: `show.bun.deps.sh`
 *   stood exactly so until 2026-09-20, and the drop in its two peers is what hid the class
 */
const DISPATCH_FLAGS = ['--repo', '--role', '--skill'];

/**
 * .what = reads a shell source's argv boundary — its default arms, and the flags it declares
 * .why = the invariant's subject is the fate of a flag token, and that fate is decided in
 *   exactly one place: the case inside the argv loop. both halves are read from that one
 *   region, so the declared set and the default arm cannot disagree about the boundary
 */
const getArgvBoundary = (input: {
  source: string;
}): { arms: { line: number; body: string }[]; declared: string[] } => {
  const lines = input.source.split('\n');
  const arms: { line: number; body: string }[] = [];
  const declared: string[] = [];

  // walk to each argv loop, then read its default arm. bounded by the loop's own `done`
  for (let i = 0; i < lines.length; i += 1) {
    if (!ARGV_LOOP_HEAD.test(lines[i]!)) continue;

    // the loop's extent — the first bare `done`. an arg parser is flat (one `case`, closed
    // by `esac`), so the first one is its own; a nested loop inside a parser would break
    // this bound and does not occur in this tree
    const closeIndex = lines.findIndex(
      (line, index) => index > i && line.trim() === 'done',
    );
    const loopEnd = closeIndex === -1 ? lines.length : closeIndex;

    for (let j = i + 1; j < loopEnd; j += 1) {
      // a declared arm — `--env)` or `--repo|--role|--skill)`. split on `|` so a grouped
      // pattern declares each of its members
      const declaredMatch = /^\s*(-[^)]*)\)/.exec(lines[j]!);
      if (declaredMatch)
        declared.push(...declaredMatch[1]!.split('|').map((flag) => flag.trim()));

      if (!/^\s*\*\)/.test(lines[j]!)) continue;

      // the arm's body — from the `*)` onward, to the `;;` that terminates it
      const bodyLines: string[] = [lines[j]!.replace(/^\s*\*\)/, '')];
      for (
        let k = j + 1;
        k < loopEnd && !bodyLines.join('\n').includes(';;');
        k += 1
      )
        bodyLines.push(lines[k]!);

      arms.push({ line: j + 1, body: bodyLines.join('\n') });
    }

    i = loopEnd;
  }

  return { arms, declared };
};

describe('unknown-flag-refusal', () => {
  given('every shell skill this repo declares', () => {
    // `fast-glob` is this repo's declared glob dep, and the one every other caller reaches for
    // (`getRoleBriefs.ts`, `discoverRoleKeyracks.ts`). `glob` is present in node_modules as a
    // transitive, so an import of it type-checks and then fails `depcheck` as undeclared
    const paths = glob
      .sync('.agent/repo=.this/**/skills/*.sh', { cwd: REPO_ROOT })
      .sort();

    then('the scan finds them — an empty scan would pass vacuously', () => {
      expect(paths.length).toBeGreaterThan(0);
    });

    when('[t0] each argv boundary is read', () => {
      const boundaries = paths.map((path) => ({
        path,
        ...getArgvBoundary({
          source: readFileSync(join(REPO_ROOT, path), 'utf8'),
        }),
      }));
      const arms = boundaries.flatMap((boundary) =>
        boundary.arms.map((arm) => ({ ...arm, path: boundary.path })),
      );

      then('at least one argv boundary is found — else the parse is broken', () => {
        expect(arms.length).toBeGreaterThan(0);
      });

      then('no default arm drops the flag token in silence', () => {
        const dropped = arms
          .filter((arm) => !REFUSES.test(arm.body) && !FORWARDS.test(arm.body))
          .map((arm) => `${arm.path}:${arm.line}`);

        expect(dropped).toEqual([]);
      });

      then('every skill that refuses declares the dispatcher flags it is handed', () => {
        const unreachable = boundaries
          .filter((boundary) => boundary.arms.some((arm) => REFUSES.test(arm.body)))
          .flatMap((boundary) =>
            DISPATCH_FLAGS.filter(
              (flag) => !boundary.declared.includes(flag),
            ).map((flag) => `${boundary.path} does not declare ${flag}`),
          );

        expect(unreachable).toEqual([]);
      });
    });
  });
});
