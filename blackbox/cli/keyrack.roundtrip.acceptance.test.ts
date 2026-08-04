import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempDirNonRepo } from '@/blackbox/.test/infra/genTestTempDirNonRepo';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

describe('keyrack roundtrip', () => {
  // kill any stale daemon to ensure fresh code is used
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
  });

  /**
   * [uc1] sudo + os.secure roundtrip
   * set -> get-locked -> unlock -> get-granted -> relock -> get-locked
   */
  given('[case1] sudo + os.secure roundtrip', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      // init keyrack so we have encrypted manifest and recipients
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key SUDO_SECURE_KEY --env sudo --vault os.secure --mech PERMANENT_VIA_REPLICA', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SUDO_SECURE_KEY',
            '--env',
            'sudo',
            '--vault',
            'os.secure',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'sudo-secure-secret-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains env: sudo', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.env).toEqual('sudo');
      });

      then('response contains vault: os.secure', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.vault).toEqual('os.secure');
      });
    });

    when('[t1] get before unlock (returns locked)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_SECURE_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });

      then('output contains unlock hint', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.fix).toContain('unlock');
      });
    });

    when('[t2] unlock --env sudo --key SUDO_SECURE_KEY', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'SUDO_SECURE_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains the unlocked key slug', () => {
        expect(result.stdout).toContain('SUDO_SECURE_KEY');
      });
    });

    when('[t3] get after unlock (returns granted)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_SECURE_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('sudo-secure-secret-value');
      });
    });

    when('[t4] relock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output mentions prune', () => {
        expect(result.stdout).toContain('prune');
      });
    });

    when('[t5] get after relock (returns locked again)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_SECURE_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });
  });

  /**
   * [uc2] sudo + os.direct roundtrip
   * set -> get-locked -> unlock -> get-granted -> relock -> get-locked
   */
  given('[case2] sudo + os.direct roundtrip', () => {
    // kill daemon to isolate from case1 state
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key SUDO_DIRECT_KEY --env sudo --vault os.direct', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'SUDO_DIRECT_KEY',
            '--env',
            'sudo',
            '--vault',
            'os.direct',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'sudo-direct-secret-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains vault: os.direct', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.vault).toEqual('os.direct');
      });
    });

    when('[t1] get before unlock (returns locked)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_DIRECT_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t2] unlock --env sudo --key SUDO_DIRECT_KEY', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'sudo',
            '--key',
            'SUDO_DIRECT_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains the unlocked key slug', () => {
        expect(result.stdout).toContain('SUDO_DIRECT_KEY');
      });
    });

    when('[t3] get after unlock (returns granted)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_DIRECT_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('sudo-direct-secret-value');
      });
    });

    when('[t4] relock --env sudo', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'relock', '--env', 'sudo'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });
    });

    when('[t5] get after relock (returns locked again)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'SUDO_DIRECT_KEY',
            '--env',
            'sudo',
            '--org',
            '@all',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });
  });

  /**
   * [uc3] regular + os.direct roundtrip
   * set -> get-locked -> unlock -> get-granted
   */
  given('[case3] regular + os.direct roundtrip', () => {
    // kill daemon to prevent state leakage from prior cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key REGULAR_DIRECT_KEY --env prod --vault os.direct', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'REGULAR_DIRECT_KEY',
            '--env',
            'prod',
            '--vault',
            'os.direct',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'regular-direct-secret-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains vault: os.direct', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.vault).toEqual('os.direct');
      });
    });

    when('[t1] get before unlock (returns locked)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'REGULAR_DIRECT_KEY',
            '--env',
            'prod',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t2] unlock --env prod --key REGULAR_DIRECT_KEY', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prod',
            '--key',
            'REGULAR_DIRECT_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains the unlocked key slug', () => {
        expect(result.stdout).toContain('REGULAR_DIRECT_KEY');
      });
    });

    when('[t3] get after unlock (returns granted)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'REGULAR_DIRECT_KEY',
            '--env',
            'prod',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('regular-direct-secret-value');
      });
    });
  });

  /**
   * [uc4] regular + os.secure roundtrip
   * set -> get-locked -> unlock -> get-granted
   */
  given('[case4] regular + os.secure roundtrip', () => {
    // kill daemon to prevent state leakage from prior cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key REGULAR_SECURE_KEY --env prod --vault os.secure --mech PERMANENT_VIA_REPLICA', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'REGULAR_SECURE_KEY',
            '--env',
            'prod',
            '--vault',
            'os.secure',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'regular-secure-secret-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response contains vault: os.secure', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.vault).toEqual('os.secure');
      });
    });

    when('[t1] get before unlock (returns locked)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'REGULAR_SECURE_KEY',
            '--env',
            'prod',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('status is locked', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t2] unlock --env prod --key REGULAR_SECURE_KEY', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'unlock',
            '--env',
            'prod',
            '--key',
            'REGULAR_SECURE_KEY',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains the unlocked key slug', () => {
        expect(result.stdout).toContain('REGULAR_SECURE_KEY');
      });
    });

    when('[t3] get after unlock (returns granted)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'REGULAR_SECURE_KEY',
            '--env',
            'prod',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('status is granted', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('regular-secure-secret-value');
      });
    });
  });

  /**
   * [uc5] @all machine-wide + NON-sudo env roundtrip (the write-only-namespace bug)
   *
   * .what = the exact repro of the @all read-path defect: an @all key set into a normal env
   *   (camp) inside a repo that has its own manifest org. before the fix, @all was a WRITE-ONLY
   *   namespace — set printed ✔ and wrote a real host, but every read threw
   *   `slug org '@all' does not match manifest org '<org>'` (a full-slug read) or reported
   *   `absent` (the --org @all read). this journey clamps that the full roundtrip now works.
   *
   * .why = covers F1 (full-slug @all read no longer ORG_MISMATCH), F2 (unlock enumerates the
   *   @all.<env>.* machine-wide slug even with a repo manifest present), F4/F5/F6 (a set @all
   *   entry is gettable, not absent, and both read forms agree).
   */
  given('[case5] @all machine-wide + non-sudo env roundtrip', () => {
    // kill daemon to isolate from prior cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const repo = useBeforeAll(async () => {
      // a repo WITH its own manifest org — so @all is genuinely cross-org, not the repo org
      const r = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: r.path,
        env: { HOME: r.path },
      });
      return r;
    });

    when('[t0] set --key PROBE --org @all --env camp --vault os.secure --mech PERMANENT_VIA_REPLICA', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'set',
            '--key',
            'PROBE',
            '--org',
            '@all',
            '--env',
            'camp',
            '--vault',
            'os.secure',
            '--mech',
            'PERMANENT_VIA_REPLICA',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
          stdin: 'all-camp-probe-secret-value\n',
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('response registers the machine-wide @all slug', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.slug).toEqual('@all.camp.PROBE');
      });
    });

    when('[t1] get --key @all.camp.PROBE (full slug, no --org) before unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', '@all.camp.PROBE', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
          logOnError: false,
        }),
      );

      then('does NOT throw ORG_MISMATCH (F1: @all is exempt from the manifest-org check)', () => {
        expect(result.stdout).not.toContain('does not match manifest org');
        expect(result.stderr).not.toContain('does not match manifest org');
      });

      then('status is locked (readable, just not yet unlocked)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('locked');
      });
    });

    when('[t2] unlock --env camp (enumerates @all.camp.* even with a repo manifest)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'camp'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output contains the unlocked @all slug (F2)', () => {
        expect(result.stdout).toContain('PROBE');
      });
    });

    when('[t3] get --key @all.camp.PROBE (full slug) after unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', '@all.camp.PROBE', '--json'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted (F5/F6: not absent)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('all-camp-probe-secret-value');
      });
    });

    when('[t4] get --org @all --env camp (the --org read form) after unlock', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'keyrack',
            'get',
            '--key',
            'PROBE',
            '--org',
            '@all',
            '--env',
            'camp',
            '--json',
          ],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('status is granted (both read forms agree — F6)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('all-camp-probe-secret-value');
      });
    });

    when('[t5] list shows the @all entry (list agrees with get — F6)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'list'],
          cwd: repo.path,
          env: { HOME: repo.path },
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('output lists the @all.camp.PROBE machine-wide slug', () => {
        expect(result.stdout).toContain('PROBE');
      });
    });
  });

  /**
   * [uc6] @all read from a NON-git cwd (the credential-helper-from-any-clone path — F7)
   *
   * .what = a git credential helper is invoked by git from arbitrary clones — sometimes from a
   *   cwd that is not a git repo at all. an @all key is machine-wide (host manifest, keyed by
   *   HOME, not gitroot), so it MUST be readable from a non-repo cwd. before F7, get/unlock threw
   *   on `getGitRepoRoot` because the cwd was not a git repo.
   *
   * .why = clamps F7: with the same HOME (where the host manifest + ssh identity live) but a cwd
   *   OUTSIDE any git repo, unlock + get for an @all key still work.
   */
  given('[case6] @all read from a non-git cwd (credential helper from any clone)', () => {
    // kill daemon to isolate from prior cases
    beforeAll(() => killKeyrackDaemonForTests({ owner: null }));

    const scene = useBeforeAll(async () => {
      // a real repo where the @all key is SET (host manifest lands under HOME=repo.path)
      const repo = await genTestTempRepo({ fixture: 'with-keyrack-multi-env' });
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init'],
        cwd: repo.path,
        env: { HOME: repo.path },
      });
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'PROBE',
          '--org',
          '@all',
          '--env',
          'camp',
          '--vault',
          'os.secure',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--json',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        stdin: 'non-repo-cwd-secret-value\n',
      });
      // a cwd that is NOT a git repo — the non-repo twin of genTestTempRepo (same
      // os.tmpdir() root, never git-inited), so unlock/get must tolerate a non-repo cwd
      const nonRepoCwd = genTestTempDirNonRepo({ label: 'keyrack' }).path;
      return { repo, nonRepoCwd };
    });

    when('[t0] unlock --env camp from a non-git cwd (same HOME)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'unlock', '--env', 'camp'],
          cwd: scene.nonRepoCwd,
          env: { HOME: scene.repo.path },
        }),
      );

      then('exits with status 0 (no "not a git repo" crash — F7)', () => {
        expect(result.status).toEqual(0);
      });

      then('does NOT complain about a git repo absence', () => {
        expect(result.stdout).not.toContain('not a git');
        expect(result.stderr).not.toContain('not a git');
      });

      then('output contains the unlocked @all slug', () => {
        expect(result.stdout).toContain('PROBE');
      });
    });

    when('[t1] get --key @all.camp.PROBE from a non-git cwd (same HOME)', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['keyrack', 'get', '--key', '@all.camp.PROBE', '--json'],
          cwd: scene.nonRepoCwd,
          env: { HOME: scene.repo.path },
        }),
      );

      then('status is granted (readable from a non-repo cwd — F7)', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.status).toEqual('granted');
      });

      then('value matches what was set', () => {
        const parsed = JSON.parse(result.stdout);
        expect(parsed.grant.key.secret).toEqual('non-repo-cwd-secret-value');
      });
    });
  });
});
