import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { getCachedClaudeCliBin } from '@/blackbox/.test/infra/genIsolatedClaudeHome';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setupRoleFixtureRepo } from '@/blackbox/.test/infra/roleFixtureRepo';

jest.setTimeout(300_000);

/**
 * .what = the regression clamp for the shared-credential blank: an enrolled REAL claude-code
 *   refreshes its login in the shared ~/.claude store, never in its actor's brain dir
 * .why =
 *   - every clone of every actor must read and refresh ONE login under ONE lock set. a
 *     per-actor store (or a per-actor lock set over one symlinked file, as in 1.48.0) lets
 *     one clone's refresh spend the token a peer then posts, and claude-code's dead-token
 *     clear blanks the login for the whole box
 *   - the store claude-code writes to is decided by CLAUDE_SECURESTORAGE_CONFIG_DIR, which
 *     rhachet sets to '' at spawn. this test proves the var reaches a real claude through
 *     the real enroll path, by where claude's own write lands
 *
 * .how = a fake HOME holds an EXPIRED fake login. claude-code refreshes it, the server
 *   rejects the fake refresh token (invalid_grant), and claude-code clears the login in the
 *   store it keys by its secure-storage dir. where that blank lands = where every write lands
 *
 * .note = no real credential is read, planted, or sent: every token here is a fake this
 *   test made. a login is only ever reported as planted | blank | absent | other
 * .note = if this clamp goes red, the env var no longer routes claude-code's store to
 *   ~/.claude (a claude-code change, or a spawn path that drops the var). the documented
 *   fallback is O10 — adopt the winner, then relink:
 *   .behavior/v2026_09_29.fix-shared-brain-credential-blanking/refs/inventory.of=options.case=O10-adopt-the-winner.md
 */

// a fake login whose access token has expired, so the first turn must refresh it
const FAKE_LOGIN_EXPIRED = {
  claudeAiOauth: {
    accessToken: 'sk-ant-oat01-rhachet-test-fake-access',
    refreshToken: 'sk-ant-ort01-rhachet-test-fake-refresh',
    expiresAt: Date.now() - 60 * 60 * 1000,
    refreshTokenExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    scopes: ['user:inference', 'user:profile'],
    subscriptionType: 'max',
  },
};

// a fake login whose access token is still live, as a 1.48.0 refresh winner would hold
const FAKE_LOGIN_LIVE = {
  claudeAiOauth: {
    ...FAKE_LOGIN_EXPIRED.claudeAiOauth,
    accessToken: 'sk-ant-oat01-rhachet-test-fake-access-live',
    refreshToken: 'sk-ant-ort01-rhachet-test-fake-refresh-live',
    expiresAt: Date.now() + 60 * 60 * 1000,
  },
};

// a fake env credential; the server rejects it, which is all a fake can prove
const FAKE_ENV_TOKEN = 'sk-ant-oat01-rhachet-test-fake-env';

/**
 * .what = the state of a login file, in words that never carry a token
 */
const asLoginState = (input: {
  path: string;
}): 'absent' | 'planted' | 'blank' | 'other' => {
  if (!existsSync(input.path)) return 'absent';
  const parsed: {
    claudeAiOauth?: { refreshToken?: unknown };
  } = JSON.parse(readFileSync(input.path, 'utf-8'));
  const refreshToken = parsed.claudeAiOauth?.refreshToken;
  if (refreshToken === '') return 'blank';
  if (refreshToken === FAKE_LOGIN_EXPIRED.claudeAiOauth.refreshToken) return 'planted';
  return 'other';
};

describe('rhx enroll vs a real claude-code: one shared login store', () => {
  given('[case1] a HOME whose ~/.claude holds an expired login, and no env credential', () => {
    const scene = useBeforeAll(async () => {
      const { binDir } = getCachedClaudeCliBin();

      // the fake HOME: an expired login in ~/.claude, and a first-run state already settled
      const home = genTempDir({ slug: 'enroll-shared-auth-home' });
      mkdirSync(join(home, '.claude'), { recursive: true });
      const loginShared = join(home, '.claude', '.credentials.json');
      writeFileSync(loginShared, JSON.stringify(FAKE_LOGIN_EXPIRED), { mode: 0o600 });
      writeFileSync(
        join(home, '.claude.json'),
        `${JSON.stringify({ hasCompletedOnboarding: true, theme: 'dark' }, null, 2)}\n`,
      );

      // a decoy the caller points the store at — rhachet must override it (F8)
      const decoy = genTempDir({ slug: 'enroll-shared-auth-decoy' });

      // the env: no credential of any kind, the cached claude-code first on PATH
      const env = {
        ...envIsolated(home),
        PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
        ANTHROPIC_API_KEY: undefined,
        ANTHROPIC_AUTH_TOKEN: undefined,
        CLAUDE_CODE_OAUTH_TOKEN: undefined,
        CLAUDE_CONFIG_DIR: undefined,
        CLAUDE_SECURESTORAGE_CONFIG_DIR: decoy,
      };

      // a repo with roles linked, so enroll has a roleset to render
      const dir = genTempDir({ slug: 'enroll-shared-auth-repo' });
      setupRoleFixtureRepo({ dir });
      invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic'],
        cwd: dir,
        env,
      });

      return { home, loginShared, decoy, dir, env };
    });

    when('[t0] a print-mode clone is enrolled and must refresh its login', () => {
      const run = useBeforeAll(async () => {
        const enrolled = invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--model', 'haiku', '--await', '-p', 'reply ok'],
          cwd: scene.dir,
          env: scene.env,
          timeoutMs: 180_000,
          logOnError: false,
        });

        // the one brain dir the enroll prepared for its actor
        const actorsDir = join(scene.dir, '.agent', '.actors');
        const actorDirNames = readdirSync(actorsDir).filter((name) =>
          name.startsWith('actor.via.hash='),
        );
        const brainDirs = actorDirNames.map((name) =>
          join(actorsDir, name, 'brain', '.claude'),
        );
        return { enrolled, brainDirs };
      });

      then('enroll prepared exactly one actor brain dir', () => {
        expect(run.brainDirs).toHaveLength(1);
      });

      then("claude-code's refresh wrote to the shared ~/.claude login (O10 is the fallback if red)", () => {
        // the fake refresh token is rejected, so claude-code clears the login it keys by its
        // secure-storage dir. a blank HERE proves that dir is ~/.claude
        expect(asLoginState({ path: scene.loginShared })).toEqual('blank');
      });

      then('the actor brain dir holds no login of its own', () => {
        expect(existsSync(join(run.brainDirs[0]!, '.credentials.json'))).toBe(false);
      });

      then('the actor brain dir still holds its own config', () => {
        // config stays per actor: only the login store is shared
        expect(existsSync(join(run.brainDirs[0]!, '.claude.json'))).toBe(true);
      });

      then("a caller's own secure-storage dir is overridden, never written (F8)", () => {
        expect(existsSync(join(scene.decoy, '.credentials.json'))).toBe(false);
      });
    });

    when('[t1] a second clone is enrolled against the now-dead shared login', () => {
      const run = useBeforeAll(async () => {
        const clonesBefore = asCloneDirNames({ dir: scene.dir });
        const enrolled = invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--model', 'haiku', '--await', '-p', 'reply ok'],
          cwd: scene.dir,
          env: scene.env,
          timeoutMs: 180_000,
          logOnError: false,
        });
        const clonesAfter = asCloneDirNames({ dir: scene.dir });
        return { enrolled, clonesBefore, clonesAfter };
      });

      then('enroll refuses with a constraint exit', () => {
        expect(run.enrolled.status).toEqual(2);
      });

      then('the refusal names the dead login and the /login cure', () => {
        const output = `${run.enrolled.stdout}\n${run.enrolled.stderr}`;
        expect(output).toContain("the box's claude login is dead");
        expect(output).toContain('/login');
      });

      then('no clone was spawned', () => {
        expect(run.clonesAfter).toEqual(run.clonesBefore);
      });

      then('the refusal a human reads is locked to a snapshot', () => {
        expect(asSnapshotSafe(run.enrolled.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] a machine enrolls against the dead login, via --async and --output json', () => {
      const run = useBeforeAll(async () => {
        const clonesBefore = asCloneDirNames({ dir: scene.dir });
        const enrolled = invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--model', 'haiku', '--async', '--output', 'json', '-p', 'reply ok'],
          cwd: scene.dir,
          env: scene.env,
          timeoutMs: 180_000,
          logOnError: false,
        });
        const clonesAfter = asCloneDirNames({ dir: scene.dir });
        return { enrolled, clonesBefore, clonesAfter };
      });

      then('the caller gets the constraint exit, relayed from the detached host', () => {
        expect(run.enrolled.status).toEqual(2);
      });

      then('the refusal names the dead login', () => {
        const output = `${run.enrolled.stdout}\n${run.enrolled.stderr}`;
        expect(output).toContain("the box's claude login is dead");
      });

      then('no clone was spawned', () => {
        expect(run.clonesAfter).toEqual(run.clonesBefore);
      });
    });

    when('[t3] a clone is enrolled against the dead login, with an env credential set', () => {
      const run = useBeforeAll(async () => {
        const clonesBefore = asCloneDirNames({ dir: scene.dir });
        const enrolled = invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--model', 'haiku', '--await', '-p', 'reply ok'],
          cwd: scene.dir,
          env: { ...scene.env, CLAUDE_CODE_OAUTH_TOKEN: FAKE_ENV_TOKEN },
          timeoutMs: 180_000,
          logOnError: false,
        });
        const clonesAfter = asCloneDirNames({ dir: scene.dir });
        return { enrolled, clonesBefore, clonesAfter };
      });

      then('enroll does not refuse on the dead login', () => {
        // claude-code prefers the env credential, so the dead file is no reason to refuse.
        // the fake token itself is rejected by the server, so only the refusal is asserted
        const output = `${run.enrolled.stdout}\n${run.enrolled.stderr}`;
        expect(output).not.toContain("the box's claude login is dead");
      });

      then('a clone was spawned', () => {
        expect(run.clonesAfter.length).toEqual(run.clonesBefore.length + 1);
      });

      then('the dead shared login is left as it was', () => {
        expect(asLoginState({ path: scene.loginShared })).toEqual('blank');
      });
    });

    when('[t4] the actor brain dir holds a live 1.48.0 login, and no clone of it lives', () => {
      const run = useBeforeAll(async () => {
        // the 1.48.0 leftover: a live login of the actor's own, beside a dead shared one
        const actorsDir = join(scene.dir, '.agent', '.actors');
        const actorDirName = readdirSync(actorsDir).find((name) =>
          name.startsWith('actor.via.hash='),
        )!;
        const brainDirAuthPath = join(
          actorsDir,
          actorDirName,
          'brain',
          '.claude',
          '.credentials.json',
        );
        writeFileSync(brainDirAuthPath, JSON.stringify(FAKE_LOGIN_LIVE), { mode: 0o600 });

        const clonesBefore = asCloneDirNames({ dir: scene.dir });
        const enrolled = invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--model', 'haiku', '--await', '-p', 'reply ok'],
          cwd: scene.dir,
          env: scene.env,
          timeoutMs: 180_000,
          logOnError: false,
        });
        const clonesAfter = asCloneDirNames({ dir: scene.dir });
        return { enrolled, clonesBefore, clonesAfter, brainDirAuthPath };
      });

      then('enroll adopts the live login into the shared store, and says so', () => {
        expect(run.enrolled.stderr).toContain('adopted the later login from');
      });

      then('the adoption revives the box: enroll does not refuse on the dead login', () => {
        // the migration runs before the dead-login check, so a fleet heals with no /login
        const output = `${run.enrolled.stdout}\n${run.enrolled.stderr}`;
        expect(output).not.toContain("the box's claude login is dead");
      });

      then('a clone was spawned', () => {
        expect(run.clonesAfter.length).toEqual(run.clonesBefore.length + 1);
      });

      then('the actor brain dir holds no login of its own', () => {
        expect(existsSync(run.brainDirAuthPath)).toBe(false);
      });
    });
  });
});

/**
 * .what = the clone dirs on disk across every actor of a repo
 */
const asCloneDirNames = (input: { dir: string }): string[] => {
  const actorsDir = join(input.dir, '.agent', '.actors');
  return readdirSync(actorsDir)
    .filter((name) => name.startsWith('actor.via.hash='))
    .flatMap((name) => {
      const clonesDir = join(actorsDir, name, 'clones');
      if (!existsSync(clonesDir)) return [];
      return readdirSync(clonesDir).map((clone) => `${name}/${clone}`);
    })
    .sort();
};
