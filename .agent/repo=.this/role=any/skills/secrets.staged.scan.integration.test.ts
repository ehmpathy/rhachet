import { execSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { asTestKeyText } from '@src/.test/assets/asTestKeyText';
import { genTempDirPhysical } from '@src/.test/infra/genTempDirPhysical';

/**
 * .what = the clamp on secrets.staged.scan: it lists EVERY staged key shape the husky secrets
 *         check would refuse, in one pass, and never echoes the key text
 * .why = the hook halts on its first hit, so without this a commit with N key-shaped files costs
 *        N refused commits. the scan must find all N, or it is no better than the hook
 *
 * .note = integration, never unit: it spawns the skill against a real git index, in a temp repo
 *         so this tree's index is never touched
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SKILL = join(__dirname, 'secrets.staged.scan.sh');

/** a throwaway key body, with a marker the scan must never echo */
const KEY_BODY_MARKER = 'SCANBITEMARKER0123456789abcdef';

/**
 * .what = a temp git repo with the real hook copied in, so the scan reads the same shapes
 */
const genScanRepo = (input: { slug: string }): string => {
  const dir = genTempDirPhysical({ slug: input.slug, git: true });
  mkdirSync(join(dir, '.husky'), { recursive: true });
  copyFileSync(join(REPO_ROOT, '.husky', 'check.secrets.sh'), join(dir, '.husky', 'check.secrets.sh'));
  return dir;
};

/**
 * .what = runs the skill with the given repo as cwd
 * .note = via 'rhx' goes through the real dispatcher (`npx rhx <skill>`), as a contributor does
 */
const runScan = (input: {
  cwd: string;
  args?: string[];
  via?: 'bash' | 'rhx';
}): { status: number | null; stdout: string; stderr: string } => {
  const launch: { command: string; prefix: string[] } =
    input.via === 'rhx'
      ? { command: 'npx', prefix: ['rhx', 'secrets.staged.scan'] }
      : { command: 'bash', prefix: [SKILL] };
  const result = spawnSync(launch.command, [...launch.prefix, ...(input.args ?? [])], { cwd: input.cwd, encoding: 'utf-8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

describe('secrets.staged.scan', () => {
  given('[case1] two staged files each hold a private key block', () => {
    when('[t0] the scan runs', () => {
      const result = useBeforeAll(async () => {
        const dir = genScanRepo({ slug: 'secrets-scan-hits' });
        const keyText = asTestKeyText({ kind: 'RSA', body: [KEY_BODY_MARKER] });
        writeFileSync(join(dir, 'a.txt'), `first line\n${keyText}\n`);
        writeFileSync(join(dir, 'b.txt'), `${keyText}\n`);
        execSync('git add a.txt b.txt', { cwd: dir, stdio: 'ignore' });
        return runScan({ cwd: dir });
      });

      then('it exits 2 and lists BOTH files, not just the first', () => {
        // the output rides in the object, so a red row shows what the scan said
        expect({
          status: result.status,
          hasA: result.stdout.includes('a.txt:2 [private key block]'),
          hasB: result.stdout.includes('b.txt:1 [private key block]'),
          stdout: result.stdout,
        }).toMatchObject({ status: 2, hasA: true, hasB: true });
      });

      then('it never echoes the key text', () => {
        expect(`${result.stdout}${result.stderr}`).not.toContain(KEY_BODY_MARKER);
      });

      then('the hits and the qualified tally render as snapshotted', () => {
        expect(result.stderr).toContain('✋ ConstraintError: 2 staged secret key shapes');
        expect({ stdout: result.stdout, stderr: result.stderr }).toMatchSnapshot();
      });
    });
  });

  given('[case6] a caller goes through the real `rhx` dispatcher', () => {
    when('[t0] an unknown option is passed via `npx rhx`, from the repo root', () => {
      const result = runScan({ cwd: REPO_ROOT, args: ['--all'], via: 'rhx' });

      then('rhx dispatches to the skill, and its own --skill pair is neither refused nor echoed', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: unknown option: --all');
        expect(result.stderr).toContain('ran = rhx secrets.staged.scan --all\n');
        expect(result.stderr).not.toContain('unknown option: --skill');
        // rhx colors its frame, so strip ansi sgr bytes before the render is snapped
        expect(result.stderr.replace(/\x1B\[[0-9;]*m/g, '')).toMatchSnapshot();
      });
    });
  });

  given('[case5] the hook cannot be read as shapes', () => {
    /**
     * .what = a temp repo whose hook holds the given text in place of the real one
     */
    const genRepoWithHook = (input: { slug: string; hook: string }): string => {
      const dir = genTempDirPhysical({ slug: input.slug, git: true });
      mkdirSync(join(dir, '.husky'), { recursive: true });
      writeFileSync(join(dir, '.husky', 'check.secrets.sh'), input.hook);
      writeFileSync(join(dir, 'a.txt'), 'staged\n');
      execSync('git add a.txt', { cwd: dir, stdio: 'ignore' });
      return dir;
    };

    when('[t0] the hook holds no SHAPES block', () => {
      const result = useBeforeAll(async () =>
        runScan({ cwd: genRepoWithHook({ slug: 'secrets-scan-noshapes', hook: '#!/bin/bash\n' }) }),
      );

      then('it fails loud as a malfunction (exit 1), never as a clean scan', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).not.toContain('no staged secret key shapes');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] a shape does not compile as a regex', () => {
      const result = useBeforeAll(async () =>
        runScan({
          cwd: genRepoWithHook({
            slug: 'secrets-scan-badregex',
            hook: '#!/bin/bash\nEDGE=x\nSHAPES="broken shape|(unclosed"\n',
          }),
        }),
      );

      then('it fails loud as a malfunction (exit 1) that names the shape, never as a clean scan', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).not.toContain('no staged secret key shapes');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] a caller asks for help', () => {
    when('[t0] --help is passed', () => {
      const result = useBeforeAll(async () =>
        runScan({ cwd: genScanRepo({ slug: 'secrets-scan-help' }), args: ['--help'] }),
      );

      then('it exits 0 and renders the usage', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] a caller makes a fixable mistake', () => {
    when('[t0] an unknown option is passed', () => {
      const result = useBeforeAll(async () =>
        runScan({ cwd: genScanRepo({ slug: 'secrets-scan-unknown' }), args: ['--all'] }),
      );

      then('it refuses with exit 2 and a pointer to help, never silently ignores it', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] the scan runs outside the repo root, where the hook is absent', () => {
      const result = useBeforeAll(async () => {
        const dir = genTempDirPhysical({ slug: 'secrets-scan-nohook', git: true });
        return { dir, ...runScan({ cwd: dir, args: [] }) };
      });

      then('it refuses as a constraint (exit 2), names the cwd it read from, and the fix', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(`cwd = ${result.dir}`);
        // the cwd is a per-run temp dir, so it is masked to a stable token for the snapshot
        expect(result.stderr.split(result.dir).join('$CWD')).toMatchSnapshot();
      });
    });
  });

  given('[case2] the staged files hold no key shape', () => {
    when('[t0] the scan runs', () => {
      const result = useBeforeAll(async () => {
        const dir = genScanRepo({ slug: 'secrets-scan-clean' });
        writeFileSync(join(dir, 'clean.txt'), 'no secret here\n');
        execSync('git add clean.txt', { cwd: dir, stdio: 'ignore' });
        return runScan({ cwd: dir });
      });

      then('it exits 0 and says so', () => {
        expect({ status: result.status, stdout: result.stdout }).toMatchObject({
          status: 0,
          stdout: expect.stringContaining('no staged secret key shapes'),
        });
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
