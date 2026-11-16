import { execFileSync, spawnSync } from 'child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = the pre-commit secrets hook, run for real against a temp git repo
 * .why = the hook halts a commit; its refusal is the text a human reads at the worst moment, so
 *   each variant is snapped, and a clean stage must pass
 * .note = every key below is built at run time from split parts, so this file's own staged blob
 *   holds no key shape for the hook to catch
 */

/**
 * .what = this process's env, less any git var a parent hook set, so git reads the temp repo
 */
const ENV_GIT_FREE = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
);

/**
 * .what = a temp git repo that holds a copy of the hook, with one file staged
 */
const genRepoWithStaged = (input: { slug: string; file: string; content: string }): string => {
  const dir = genTempDir({ slug: input.slug });
  execFileSync('git', ['init', '--quiet'], { cwd: dir, env: ENV_GIT_FREE });
  mkdirSync(join(dir, '.husky'), { recursive: true });
  copyFileSync(join(__dirname, 'check.secrets.sh'), join(dir, '.husky', 'check.secrets.sh'));
  writeFileSync(join(dir, input.file), input.content);
  execFileSync('git', ['add', input.file], { cwd: dir, env: ENV_GIT_FREE });
  return dir;
};

/**
 * .what = run the hook in a repo
 */
const runHook = (input: { dir: string }): { status: number | null; stderr: string } => {
  const ran = spawnSync('bash', ['.husky/check.secrets.sh'], {
    cwd: input.dir,
    env: ENV_GIT_FREE,
    encoding: 'utf-8',
  });
  return { status: ran.status, stderr: ran.stderr };
};

const KEY_AWS = ['AK', 'IA', 'ABCDEFGHIJKLMNOP'].join('');
const KEY_PRIVATE_BLOCK = ['-----BEGIN ', 'RSA PRIVATE', ' KEY-----'].join('');

/**
 * .what = one fake key per remaining shape the hook knows, each built from parts
 */
const KEYS_BY_SHAPE: Array<{ slug: string; key: string; shape: string }> = [
  { slug: 'github', key: ['gh', 'p_', 'A'.repeat(36)].join(''), shape: 'github token' },
  { slug: 'openai', key: ['sk', '-proj-', 'A'.repeat(24)].join(''), shape: 'openai-style key' },
  // the anthropic `sk-ant-` also fits the wider openai `sk-` shape; this row proves the narrow
  // shape is checked first, so the human is told which vendor to rotate at
  { slug: 'anthropic', key: ['sk', '-ant-', 'A'.repeat(24)].join(''), shape: 'anthropic key' },
  { slug: 'xai', key: ['xa', 'i-', 'A'.repeat(24)].join(''), shape: 'xai key' },
  { slug: 'fireworks', key: ['fw', '_', 'A'.repeat(24)].join(''), shape: 'fireworks key' },
  { slug: 'slack', key: ['xo', 'xb-', 'A'.repeat(16)].join(''), shape: 'slack token' },
  { slug: 'stripe', key: ['sk', '_live_', 'A'.repeat(20)].join(''), shape: 'stripe secret key' },
];

describe('check.secrets', () => {
  given('[case1] a stage with no key shape', () => {
    when('[t0] the hook runs', () => {
      const result = useThen('it runs', async () =>
        runHook({
          dir: genRepoWithStaged({
            slug: 'check-secrets-clean',
            file: 'notes.md',
            content: 'a plain note\nwith a disk-sk-like word: mydisk-sk-notakey\n',
          }),
        }),
      );
      then('it passes with exit 0 and says naught', () => {
        expect(result.status).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case2] a stage that holds a key shape', () => {
    [
      { slug: 'aws', file: 'config.ts', content: `const id = '${KEY_AWS}';\n`, shape: 'aws access key id' },
      {
        slug: 'private-block',
        file: 'id_rsa',
        content: `line one\n${KEY_PRIVATE_BLOCK}\nabc\n`,
        shape: 'private key block',
      },
      ...KEYS_BY_SHAPE.map((one) => ({
        slug: one.slug,
        file: 'config.ts',
        content: `const key = '${one.key}';\n`,
        shape: one.shape,
      })),
    ].map((variant, index) =>
      when(`[t${index}] the key shape is ${variant.shape}`, () => {
        const result = useThen('it runs', async () =>
          runHook({
            dir: genRepoWithStaged({
              slug: `check-secrets-${variant.slug}`,
              file: variant.file,
              content: variant.content,
            }),
          }),
        );
        then('it halts with exit 2, names the shape and the file:line, and never the key', () => {
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain('✋ ConstraintError: a secret key shape is staged');
          expect(result.stderr).toContain(`shape: ${variant.shape}`);
          expect(result.stderr).toContain(`├─ ${variant.file}:`);
          expect(result.stderr).toContain(
            '└─ a fake fixture, never a real key? mark its line with check.secrets:allow',
          );
          expect(result.stderr).not.toContain(KEY_AWS);
          KEYS_BY_SHAPE.forEach((one) => expect(result.stderr).not.toContain(one.key));
          expect(result.stderr).toMatchSnapshot();
        });
      }),
    );
  });

  given('[case3] a staged blob git cannot read', () => {
    when('[t0] the hook runs', () => {
      const result = useThen('it runs', async () => {
        const dir = genRepoWithStaged({
          slug: 'check-secrets-unreadable',
          file: 'notes.md',
          content: 'a plain note\n',
        });
        const blob = execFileSync('git', ['rev-parse', ':notes.md'], {
          cwd: dir,
          env: ENV_GIT_FREE,
          encoding: 'utf-8',
        }).trim();
        rmSync(join(dir, '.git', 'objects', blob.slice(0, 2), blob.slice(2)), { force: true });
        return runHook({ dir });
      });
      then('it halts with exit 1, as a malfunction, and names the file', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain(
          '💥 MalfunctionError: check.secrets could not read the staged blob',
        );
        expect(result.stderr).toContain('└─ notes.md');

        // git's own `fatal:` / `error:` lines vary by git version; the hook's words are pinned
        expect(result.stderr.replace(/^(fatal|error): .*\n/gm, '')).toMatchSnapshot();
      });
    });
  });

  given('[case4] a fake fixture key whose line carries the allow marker', () => {
    const MARK = ['check.secrets', 'allow'].join(':');

    when('[t0] the staged file is a real acceptance test of this repo, with pem fixtures', () => {
      const result = useThen('it runs', async () => {
        const file = 'keyrack.vault.osSecure.githubApp.acceptance.test.ts';
        const dir = genRepoWithStaged({ slug: 'check-secrets-repo-fixture', file, content: '' });
        copyFileSync(join(__dirname, '..', 'blackbox', 'cli', file), join(dir, file));
        execFileSync('git', ['add', file], { cwd: dir, env: ENV_GIT_FREE });
        return runHook({ dir });
      });
      then('it passes with exit 0, so the tree this hook ships in can commit', () => {
        expect(result.status).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });

    when('[t1] a marked fake key sits beside an unmarked one', () => {
      const result = useThen('it runs', async () =>
        runHook({
          dir: genRepoWithStaged({
            slug: 'check-secrets-mark-scope',
            file: 'fixture.ts',
            content: `const a = '${KEY_AWS}'; // ${MARK}\nconst b = '${KEY_AWS}';\n`,
          }),
        }),
      );
      then('it halts on the unmarked line only, so the marker covers its own line and no other', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('├─ fixture.ts:2');
        expect(result.stderr).not.toContain(KEY_AWS);
      });
    });

    when('[t2] every key-shaped line is marked', () => {
      const result = useThen('it runs', async () =>
        runHook({
          dir: genRepoWithStaged({
            slug: 'check-secrets-mark-all',
            file: 'fixture.ts',
            content: `const a = '${KEY_AWS}'; // ${MARK}\nconst b = [\n  '${KEY_PRIVATE_BLOCK}', // ${MARK}\n];\n`,
          }),
        }),
      );
      then('it passes with exit 0 and says naught', () => {
        expect(result.status).toEqual(0);
        expect(result.stderr).toEqual('');
      });
    });
  });
});
