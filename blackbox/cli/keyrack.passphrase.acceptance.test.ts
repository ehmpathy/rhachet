import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { asSyntheticOpensshKeyPem } from '@/blackbox/.test/assets/asSyntheticOpensshKeyPem';
import { genSampleAskpassDialog } from '@/blackbox/.test/assets/genSampleAskpassDialog';
import { genSampleRsaKey } from '@/blackbox/.test/assets/genSampleRsaKey';
import { genSampleSshKey } from '@/blackbox/.test/assets/genSampleSshKey';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = blackbox proof of the passphrased-ed25519 (Variant A) unlock UX through
 *         the built CLI binary, with a fake askpass dialog that supplies the
 *         passphrase — so the wish's core UX is covered end to end via the contract
 * .why  = the sign-as-kdf chain is proven at the domain-integration layer, but every
 *         other keyrack acceptance test uses a passphrase-LESS key; the passphrase
 *         prompt, the ephemeral agent, and the KEYRACK_ASKPASS seam were never driven
 *         through the compiled CLI. this walks init -> set -> unlock -> get against a
 *         passphrase-PROTECTED key, so the whole Variant A path is exercised for real
 *
 * .note = KEYRACK_ASKPASS points ssh-add at a fake dialog — a shell executable that
 *         echoes the passphrase. SSH_ASKPASS_REQUIRE=force (set inside keyrack) makes
 *         ssh-add use it headlessly, so no real display or tty is needed. the fake
 *         dialog is an OS-boundary test double (a real executable), NOT a jest mock,
 *         so this honors rule.forbid.acceptance.mocks
 */
describe('keyrack passphrased-ed25519 unlock (Variant A)', () => {
  // the passphrase both the generated key and the fake dialog agree on
  const PASSPHRASE = 'correct-horse-battery-staple';

  // kill daemons from prior test runs to prevent state leakage
  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: null });
    killKeyrackDaemonForTests({ owner: 'robot' });
  });

  /**
   * [uc1] a passphrase-protected ed25519 key unlocks via the fake dialog
   * init -> set -> unlock -> get all succeed; the secret roundtrips
   */
  given('[case1] passphrased ed25519 key, correct passphrase via fake dialog', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'passphrase-ok',
      });

      // generate a passphrase-PROTECTED ed25519 key outside ~/.ssh/
      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const prikeyPath = join(keyDir, 'passphrased_key');
      genSampleSshKey({ keyPath: prikeyPath, passphrase: PASSPHRASE });

      // write a fake askpass dialog: it records that it was invoked (proving the
      // prompt went through the dialog seam, never the tty), then echoes the
      // passphrase for ssh-add to consume
      const askpassLog = join(repo.path, 'askpass.invoked.log');
      const { path: askpassPath } = genSampleAskpassDialog({
        path: join(repo.path, 'fake-askpass.sh'),
        passphrase: PASSPHRASE,
        logPath: askpassLog,
      });

      const env = {
        HOME: repo.path,
        KEYRACK_ASKPASS: askpassPath,
      };

      // count how many times the fake dialog has been invoked so far — the askpass log
      // gains one 'invoked' line per prompt. a count between steps lets each command's
      // OWN prompt total be asserted exactly (nit 6), not just a loose combined total
      const countPrompts = (): number =>
        existsSync(askpassLog)
          ? readFileSync(askpassLog, 'utf8')
              .split('\n')
              .filter((line) => line === 'invoked').length
          : 0;

      // step 1: init — routes to Variant A (passphrased ed25519), prompts once
      const initResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env,
      });
      const promptsAfterInit = countPrompts();

      // step 2: set — decrypts the manifest (prompts), writes a host entry
      const setResult = await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'PASSPHRASE_ROUNDTRIP',
          '--env',
          'sudo',
          '--org',
          'testorg',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault',
          'os.secure',
          '--owner',
          'robot',
          '--prikey',
          prikeyPath,
        ],
        cwd: repo.path,
        env,
        stdin: 'passphrase-secret-value\n',
      });
      const promptsAfterSet = countPrompts();

      // step 3: unlock — recovers K via the ephemeral agent (prompts), grants
      const unlockResult = await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'unlock',
          '--owner',
          'robot',
          '--prikey',
          prikeyPath,
          '--env',
          'sudo',
          '--key',
          'testorg.sudo.PASSPHRASE_ROUNDTRIP',
        ],
        cwd: repo.path,
        env,
      });
      const promptsAfterUnlock = countPrompts();

      // step 4: get — reads the grant from the daemon (no prompt)
      const getResult = await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'get',
          '--key',
          'testorg.sudo.PASSPHRASE_ROUNDTRIP',
          '--owner',
          'robot',
          '--json',
        ],
        cwd: repo.path,
        env,
      });

      return {
        repo,
        askpassLog,
        initResult,
        setResult,
        unlockResult,
        getResult,
        promptsAfterInit,
        promptsAfterSet,
        promptsAfterUnlock,
      };
    });

    when('[t0] the full passphrased roundtrip runs', () => {
      then('init succeeds and mints a fresh manifest', () => {
        expect(scene.initResult.status).toEqual(0);
        expect(scene.initResult.stdout).toContain('freshly minted');
      });

      then('the host manifest was written', () => {
        const manifestPath = join(
          scene.repo.path,
          '.rhachet',
          'keyrack',
          'keyrack.host.robot.age',
        );
        expect(existsSync(manifestPath)).toBe(true);
      });

      then('set succeeds', () => {
        expect(scene.setResult.status).toEqual(0);
      });

      then('unlock succeeds', () => {
        expect(scene.unlockResult.status).toEqual(0);
      });

      then('get returns the roundtripped secret', () => {
        expect(scene.getResult.status).toEqual(0);
        const parsed = JSON.parse(scene.getResult.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.key.secret).toEqual('passphrase-secret-value');
      });

      then('the passphrase never leaks onto the CLI streams (q2 keylogger mitigation)', () => {
        // the whole feature exists to keep the passphrase OFF the terminal: it is
        // typed into the gnome dialog (SSH_ASKPASS), never echoed by keyrack itself.
        // prove that promise directly — the passphrase value must appear in NONE of
        // the command streams (stdout AND stderr, across init/set/unlock/get). if a
        // future refactor ever routed the passphrase through keyrack's own stdio (a
        // tty fallback, a stray debug line), this goes red. q2 is the security
        // property that motivated the whole wish, so it earns a direct assertion, not
        // just the indirect "the fake dialog fired" proof (rule.require.test-covered-repairs)
        const allStreams = [
          scene.initResult,
          scene.setResult,
          scene.unlockResult,
          scene.getResult,
        ]
          .flatMap((result) => [result.stdout, result.stderr])
          .join('\n');
        expect(allStreams).not.toContain(PASSPHRASE);
      });

      then('a pre-prompt banner is printed before the dialog can pop', () => {
        // the vision day-in-the-life shows a `🔐 … identity` line BEFORE the
        // native dialog appears, so a human is never left at a blank terminal
        // unsure if it hung while a GUI dialog is seconds away. the banner is a
        // status notice, so it goes to stderr (stdout stays clean for --json)
        expect(scene.initResult.stderr).toContain('🔐 initialize robot identity');
        expect(scene.unlockResult.stderr).toContain('🔐 unlock robot identity');

        // snapshot the exact banner lines so their text/shape cannot silently
        // drift (rule.forbid.friction-hazards). pluck only the 🔐 line from
        // stderr — the adjacent askpass log carries machine-specific paths, so
        // the isolated banner line is the deterministic human-visible surface
        const asBannerLine = (stderr: string): string =>
          stderr.split('\n').find((line) => line.includes('🔐')) ?? '';
        expect(asBannerLine(scene.initResult.stderr)).toMatchSnapshot(
          'init-banner',
        );
        expect(asBannerLine(scene.unlockResult.stderr)).toMatchSnapshot(
          'unlock-banner',
        );
      });

      then('set — a read command that is NOT init/unlock — also gets the banner', () => {
        // set/del/list/recipient/fill all decrypt the manifest through the SAME
        // choke point (genManifestIdentityViaVariantA) that pops the dialog, so
        // the banner covers them all — proven here for set, which the askpass log
        // above confirms actually prompts. this is the gap the per-command banner
        // sites missed: only init+unlock had one before
        expect(scene.setResult.stderr).toContain('🔐 unlock robot identity');

        // snapshot the set banner line too — same friction-hazard guard
        const asBannerLine = (stderr: string): string =>
          stderr.split('\n').find((line) => line.includes('🔐')) ?? '';
        expect(asBannerLine(scene.setResult.stderr)).toMatchSnapshot(
          'set-banner',
        );
      });

      then('the human-visible init + set + unlock output stays stable', () => {
        // snapshot the human-visible stdout trees (machine-specific paths/pids
        // stripped) so a silent text/shape regression on THIS feature's UX — the
        // exact concern of the wish — cannot sail through review unnoticed
        // (rule.require.snapshots / rule.require.test-coverage-by-grain). all three
        // manifest-read commands the roundtrip drives (init, set, unlock) get their
        // full stdout tree snapped, not just the banner — so no set-path drift hides
        expect(asSnapshotSafe(scene.initResult.stdout)).toMatchSnapshot('init');
        expect(asSnapshotSafe(scene.setResult.stdout)).toMatchSnapshot('set');
        expect(asSnapshotSafe(scene.unlockResult.stdout)).toMatchSnapshot(
          'unlock',
        );
      });

      then('the fake dialog was invoked (prompt went through the seam)', () => {
        // the log exists only if the fake askpass ran — proof the passphrase was
        // typed into the dialog seam, not the tty
        expect(existsSync(scene.askpassLog)).toBe(true);
        const invocations = readFileSync(scene.askpassLog, 'utf8')
          .split('\n')
          .filter((line) => line === 'invoked');
        // at least init, set, and unlock each prompt once
        expect(invocations.length).toBeGreaterThanOrEqual(3);
      });

      then('EACH command prompts EXACTLY once — the per-invocation contract', () => {
        // nit 6: the loose combined `>= 3` above cannot catch a per-command REGRESSION
        // (e.g. unlock quietly prompting twice — a double-load of the key). the deltas
        // pin each command to EXACTLY one prompt, the "prompt once per invocation" the
        // vision promises, the same exact-count guard migration already gets
        expect(scene.promptsAfterInit).toEqual(1); // init: derive K's recipient, seal
        expect(scene.promptsAfterSet - scene.promptsAfterInit).toEqual(1); // set: decrypt
        expect(scene.promptsAfterUnlock - scene.promptsAfterSet).toEqual(1); // unlock: re-derive
      });
    });
  });

  /**
   * [uc2] a cancelled dialog (non-zero exit) fails loud, never a silent degrade
   * proves the wrong/cancelled-passphrase edgecase from the vision
   */
  given('[case2] passphrased ed25519 key, dialog cancelled (exits non-zero)', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'passphrase-cancel',
      });

      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const prikeyPath = join(keyDir, 'passphrased_key');
      genSampleSshKey({ keyPath: prikeyPath, passphrase: PASSPHRASE });

      // a fake dialog that mimics the human hitting "cancel": it prints no
      // passphrase and exits non-zero, so ssh-add cannot load the key
      const askpassPath = join(repo.path, 'cancel-askpass.sh');
      writeFileSync(
        askpassPath,
        ['#!/usr/bin/env bash', 'exit 1', ''].join('\n'),
      );
      chmodSync(askpassPath, 0o755);

      const initResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: { HOME: repo.path, KEYRACK_ASKPASS: askpassPath },
        logOnError: false,
      });

      return { initResult };
    });

    when('[t0] init runs with the cancelled dialog', () => {
      then('init fails with exit code 2 (caller-fixable ConstraintError)', () => {
        // a cancelled/wrong passphrase is caller-fixable → exit 2 (not a generic
        // non-zero). asExecFailureError classifies the numeric ssh-add reject as a
        // ConstraintError, so this feature's own askpass paths honor exit-code
        // semantics (rule.require.exit-code-semantics), pinned exactly here
        expect(scene.initResult.status).toEqual(2);
      });

      then('the error names the key-load failure, not a tty fallback', () => {
        const output = scene.initResult.stdout + scene.initResult.stderr;
        // pin the exact caller-fixable text a human sees on a mistyped /
        // cancelled passphrase — this is the UX-critical error path, so its
        // phrasing gets a real regression net (not just a loose /failed/ match)
        expect(output).toContain('ssh-add could not load the key');
        expect(output).toContain('passphrase was wrong or cancelled');
        // and snapshot the sanitized human-visible output so its shape + text
        // cannot silently drift (asSnapshotSafe strips the random socket/key paths)
        expect(asSnapshotSafe(output)).toMatchSnapshot('cancelled-dialog');
      });
    });
  });

  /**
   * [uc3] the RIGHT key type, but the WRONG key — a rotated key, or one of
   * several ed25519 keys. it loads and signs fine (same passphrase), but its
   * signature derives a different wrap key, so K will not unwrap. the human must
   * get the `--prikey` fix, not a bare "failed to unwrap" — the twin of the
   * "no ed25519 key at all" message
   */
  given('[case3] a second ed25519 key signs, but it is the wrong key', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'passphrase-wrong-key',
      });

      // two passphrased ed25519 keys that share the SAME passphrase, so the one
      // fake dialog loads either — the divergence is the KEY, not the passphrase
      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const sealKeyPath = join(keyDir, 'seal_key');
      const otherKeyPath = join(keyDir, 'other_key');
      for (const keyPath of [sealKeyPath, otherKeyPath])
        genSampleSshKey({ keyPath, passphrase: PASSPHRASE });

      // a fake dialog that echoes the shared passphrase, so ssh-add loads
      // whichever key it is pointed at (headless via SSH_ASKPASS_REQUIRE=force)
      const { path: askpassPath } = genSampleAskpassDialog({
        path: join(repo.path, 'fake-askpass.sh'),
        passphrase: PASSPHRASE,
      });

      const env = { HOME: repo.path, KEYRACK_ASKPASS: askpassPath };

      // seal the manifest to seal_key
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', sealKeyPath],
        cwd: repo.path,
        env,
      });

      // then try to unlock with the OTHER key — it signs, but cannot unwrap K
      const unlockResult = await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'unlock',
          '--owner',
          'robot',
          '--prikey',
          otherKeyPath,
          '--env',
          'sudo',
          '--key',
          'testorg.sudo.ANY_KEY',
        ],
        cwd: repo.path,
        env,
        logOnError: false,
      });

      return { unlockResult };
    });

    when('[t0] unlock runs with the wrong ed25519 key', () => {
      then('unlock fails with exit code 2 (caller-fixable ConstraintError)', () => {
        // a wrong/absent seal key is caller-fixable (make it available, or --prikey) →
        // exit 2, not a server malfunction. the dao now throws ConstraintError for the
        // "no identity could decrypt" state, to match the fix its message names
        // (rule.require.exit-code-semantics) — no longer a `.not.toEqual(0)` dodge
        expect(scene.unlockResult.status).toEqual(2);
      });

      then('the error names the wrong-key fix, not a bare unwrap failure', () => {
        const output = scene.unlockResult.stdout + scene.unlockResult.stderr;
        // the caller-fixable text: it names WHAT (that key cannot unlock this
        // manifest) and points at --prikey — never the opaque internal
        // "failed to unwrap the age identity"
        expect(output).toContain('cannot unlock this keyrack manifest');
        expect(output).toContain('--prikey');
        expect(output).not.toContain('failed to unwrap the age identity');
        // snapshot the sanitized human-visible output so its shape cannot drift
        expect(asSnapshotSafe(output)).toMatchSnapshot('wrong-key');
      });
    });
  });

  /**
   * [uc4] a passphrased key on a HEADLESS session gets its OWN distinct message —
   * the vision's edgecase promise ("headless / ci / over ssh → fail fast with
   * guidance"), NOT the merged wrong/cancelled/no-display text. no display + no
   * KEYRACK_ASKPASS means the dialog cannot render, so keyrack must say so plainly
   */
  given('[case4] passphrased key, headless session (no DISPLAY, no dialog)', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'headless',
      });

      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const prikeyPath = join(keyDir, 'passphrased_key');
      genSampleSshKey({ keyPath: prikeyPath, passphrase: PASSPHRASE });

      // simulate a headless box: unset DISPLAY + WAYLAND_DISPLAY for the child (the
      // invoke helper drops undefined env keys), and set NO KEYRACK_ASKPASS — so the
      // passphrased key genuinely has no way to prompt
      const initResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: {
          HOME: repo.path,
          DISPLAY: undefined,
          WAYLAND_DISPLAY: undefined,
        },
        logOnError: false,
      });

      return { initResult };
    });

    when('[t0] init runs headless with a passphrased key', () => {
      then('init fails with exit code 2 (caller-fixable ConstraintError)', () => {
        // a headless session is caller-fixable (run local, or use a passphrase-less
        // key) → exit 2, not a generic non-zero. asHeadlessSessionMessage is thrown as
        // a ConstraintError, so this exit-code contract is pinned for the headless path
        expect(scene.initResult.status).toEqual(2);
      });

      then('the error names the no-display cause + the fixes, distinctly', () => {
        const output = scene.initResult.stdout + scene.initResult.stderr;
        // the DISTINCT headless diagnosis — names no-display, not the merged
        // wrong/cancelled/no-display text of a post-load ssh-add failure
        expect(output).toContain('no display');
        expect(output).toContain('local desktop');
        expect(output).toContain('passphrase-less key');
        // it must NOT misreport this as a wrong/cancelled passphrase — that is the
        // exact ambiguity this distinct message removes
        expect(output).not.toContain('passphrase was wrong or cancelled');
        expect(asSnapshotSafe(output)).toMatchSnapshot('headless');
      });
    });
  });

  /**
   * [uc5] KEYRACK_ASKPASS points at a dialog that is ABSENT — the single most
   * likely first-run failure (dialog not installed), proven END TO END through the
   * compiled CLI. the override is authoritative, so this is hermetic: it fails the
   * same on any host regardless of what askpass dialogs are installed there
   */
  given('[case5] KEYRACK_ASKPASS names an absent dialog (blackbox, hermetic)', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'askpass-absent',
      });

      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const prikeyPath = join(keyDir, 'passphrased_key');
      genSampleSshKey({ keyPath: prikeyPath, passphrase: PASSPHRASE });

      // point the override at a path that does not exist — an operator miswire, or
      // a first-run user with no dialog installed. authoritative → host-independent
      const initResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: {
          HOME: repo.path,
          KEYRACK_ASKPASS: join(repo.path, 'no-such-dialog'),
        },
        logOnError: false,
      });

      return { initResult };
    });

    when('[t0] init runs with an absent askpass override', () => {
      then('init fails with exit code 2 (caller-fixable ConstraintError)', () => {
        // an absent KEYRACK_ASKPASS dialog is caller-fixable (install/point at a real
        // dialog) → exit 2. getOneAskpassDialog throws a ConstraintError, so the
        // exit-code contract is pinned for the most likely first-run failure
        expect(scene.initResult.status).toEqual(2);
      });

      then('the error names the override path + the fix, not a host dialog', () => {
        const output = scene.initResult.stdout + scene.initResult.stderr;
        // names the override seam and points the human at the fix
        expect(output).toContain('KEYRACK_ASKPASS');
        // proves it did NOT silently fall through to a host-installed dialog — the
        // whole point of an authoritative override (and what makes this hermetic)
        expect(output).toContain('does not exist');
        expect(asSnapshotSafe(output)).toMatchSnapshot('askpass-absent');
      });
    });
  });

  /**
   * [uc6] REGRESSION GUARD — the init/unlock key-selection divergence.
   *
   * a machine holds TWO passphrased ed25519 keys: an owner-named ~/.ssh/robot AND a
   * standard ~/.ssh/id_ed25519. with NO --prikey, init must SEAL with the same key
   * unlock later RE-DERIVES K with. before the shared getAllSshKeyCandidatePaths fix,
   * init was owner-BLIND (picked id_ed25519) while unlock's Variant A was owner-FIRST
   * (picked robot) — sealed-with-A / unlocked-with-B → a silently wrong K → an opaque
   * "no identity could decrypt". a green roundtrip here proves the two now agree.
   */
  given('[case6] two passphrased ed25519 keys (owner + standard), no --prikey', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'key-precedence',
      });

      // both keys live in ~/.ssh (HOME = repo.path) and share the SAME passphrase,
      // so the one fake dialog loads whichever key is picked — the divergence under
      // test is the KEY the search picks, never the passphrase. the fixture seeds a
      // passwordless id_ed25519; remove it, then gen two DISTINCT passphrased keys:
      // the owner-named robot and a fresh standard id_ed25519
      const sshDir = join(repo.path, '.ssh');
      const ownerKeyPath = join(sshDir, 'robot');
      const standardKeyPath = join(sshDir, 'id_ed25519');
      execFileSync('rm', ['-f', standardKeyPath, `${standardKeyPath}.pub`], {
        timeout: 30_000,
      });
      for (const keyPath of [ownerKeyPath, standardKeyPath])
        genSampleSshKey({ keyPath, passphrase: PASSPHRASE });
      chmodSync(ownerKeyPath, 0o600);
      chmodSync(standardKeyPath, 0o600);

      const askpassLog = join(repo.path, 'askpass.invoked.log');
      const { path: askpassPath } = genSampleAskpassDialog({
        path: join(repo.path, 'fake-askpass.sh'),
        passphrase: PASSPHRASE,
        logPath: askpassLog,
      });

      const env = { HOME: repo.path, KEYRACK_ASKPASS: askpassPath };

      // step 1: init --owner robot, NO --prikey → default lookup must pick ~/.ssh/robot
      const initResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot'],
        cwd: repo.path,
        env,
      });

      // step 2: set a secret, NO --prikey
      const setResult = await invokeRhachetCliBinary({
        args: [
          'keyrack', 'set',
          '--key', 'PRECEDENCE_ROUNDTRIP',
          '--env', 'sudo',
          '--org', 'testorg',
          '--mech', 'PERMANENT_VIA_REPLICA',
          '--vault', 'os.secure',
          '--owner', 'robot',
        ],
        cwd: repo.path,
        env,
        stdin: 'precedence-secret-value\n',
      });

      // step 3: unlock, NO --prikey → Variant A must pick the SAME ~/.ssh/robot
      const unlockResult = await invokeRhachetCliBinary({
        args: [
          'keyrack', 'unlock',
          '--owner', 'robot',
          '--env', 'sudo',
          '--key', 'testorg.sudo.PRECEDENCE_ROUNDTRIP',
        ],
        cwd: repo.path,
        env,
        logOnError: false,
      });

      // step 4: get the granted secret
      const getResult = await invokeRhachetCliBinary({
        args: [
          'keyrack', 'get',
          '--key', 'testorg.sudo.PRECEDENCE_ROUNDTRIP',
          '--owner', 'robot',
          '--json',
        ],
        cwd: repo.path,
        env,
      });

      return { initResult, setResult, unlockResult, getResult };
    });

    when('[t0] init and unlock both run with no --prikey', () => {
      then('init succeeds', () => {
        expect(scene.initResult.status).toEqual(0);
      });

      then('set succeeds', () => {
        expect(scene.setResult.status).toEqual(0);
      });

      then('unlock succeeds — init sealed with the key unlock re-derives K from', () => {
        // the crux: a non-zero here is exactly the pre-fix divergence (sealed with a
        // different key than unlock re-derives with). a zero proves the two agree
        expect(scene.unlockResult.status).toEqual(0);
      });

      then('get returns the roundtripped secret', () => {
        expect(scene.getResult.status).toEqual(0);
        const parsed = JSON.parse(scene.getResult.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.key.secret).toEqual('precedence-secret-value');
      });
    });
  });

  /**
   * [uc7] a passphrase-protected RSA key — the non-ed25519 age-CLI fallback — unlocks
   * through the compiled CLI WITHOUT the garbled tty prompt the wish complained about.
   * rsa cannot back sign-as-KDF (vision q4 = ed25519-only), so it seals to a mech:'ssh'
   * recipient and decrypts via `age -d -i`. age reads a key passphrase from /dev/tty,
   * so keyrack strips the passphrase via the SAME gnome dialog first (asDecryptedSshKeyCopy)
   * and hands age the decrypted copy — the passphrase never touches the tty. this pins
   * that rsa fix END TO END through the contract (r10: the rsa path was untested at the
   * human-visible layer); the fake dialog proves the prompt went through the seam
   */
  given('[case7] passphrased rsa key, unlock via the age-CLI dialog-strip fallback', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'passphrase-rsa',
      });

      // a passphrase-PROTECTED rsa key (non-ed25519 → age-CLI fallback path).
      // genSampleSshKey is ed25519-only, so gen the rsa key inline (one case)
      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const { path: prikeyPath } = genSampleRsaKey({
        keyPath: join(keyDir, 'passphrased_rsa'),
        passphrase: PASSPHRASE,
      });

      // the fake dialog echoes the passphrase; ssh-keygen -p (the strip) reads it
      // under SSH_ASKPASS_REQUIRE=force — the same seam ed25519's ssh-add uses. the
      // log proves the prompt went through the dialog, never the tty
      const askpassLog = join(repo.path, 'askpass.invoked.log');
      const { path: askpassPath } = genSampleAskpassDialog({
        path: join(repo.path, 'fake-askpass.sh'),
        passphrase: PASSPHRASE,
        logPath: askpassLog,
      });

      const env = { HOME: repo.path, KEYRACK_ASKPASS: askpassPath };

      // step 1: init — seals the manifest to the rsa mech:'ssh' recipient (age -r,
      // pubkey-only, no prompt)
      const initResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env,
      });

      // step 2: set — decrypts the manifest via the dialog-strip fallback, writes a host
      const setResult = await invokeRhachetCliBinary({
        args: [
          'keyrack', 'set',
          '--key', 'RSA_ROUNDTRIP',
          '--env', 'sudo',
          '--org', 'testorg',
          '--mech', 'PERMANENT_VIA_REPLICA',
          '--vault', 'os.secure',
          '--owner', 'robot',
          '--prikey', prikeyPath,
        ],
        cwd: repo.path,
        env,
        stdin: 'rsa-secret-value\n',
      });

      // step 3: unlock — decrypts via the dialog-strip fallback again, grants
      const unlockResult = await invokeRhachetCliBinary({
        args: [
          'keyrack', 'unlock',
          '--owner', 'robot',
          '--prikey', prikeyPath,
          '--env', 'sudo',
          '--key', 'testorg.sudo.RSA_ROUNDTRIP',
        ],
        cwd: repo.path,
        env,
        logOnError: false,
      });

      // step 4: get — reads the grant from the daemon (no prompt)
      const getResult = await invokeRhachetCliBinary({
        args: [
          'keyrack', 'get',
          '--key', 'testorg.sudo.RSA_ROUNDTRIP',
          '--owner', 'robot',
          '--json',
        ],
        cwd: repo.path,
        env,
      });

      return { askpassLog, initResult, setResult, unlockResult, getResult };
    });

    when('[t0] the full passphrased-rsa roundtrip runs', () => {
      then('init succeeds and seals to the rsa recipient', () => {
        expect(scene.initResult.status).toEqual(0);
      });

      then('set succeeds — decrypts via the dialog-strip fallback', () => {
        expect(scene.setResult.status).toEqual(0);
      });

      then('unlock succeeds — no tty prompt, the dialog strip carried it', () => {
        expect(scene.unlockResult.status).toEqual(0);
      });

      then('get returns the roundtripped secret', () => {
        expect(scene.getResult.status).toEqual(0);
        const parsed = JSON.parse(scene.getResult.stdout);
        expect(parsed.status).toEqual('granted');
        expect(parsed.grant.key.secret).toEqual('rsa-secret-value');
      });

      then('the human-visible rsa init + set + unlock output stays stable', () => {
        // snapshot the sanitized stdout trees the SAME way ed25519 case1 does — so a
        // silent UX/text regression on the rsa-specific path cannot sail past review
        // (r10 i039 nit 7: case7 pinned only pass/fail + JSON, not the human surface).
        // asSnapshotSafe strips the random socket/key/pid paths for determinism
        expect(asSnapshotSafe(scene.initResult.stdout)).toMatchSnapshot('rsa-init');
        expect(asSnapshotSafe(scene.setResult.stdout)).toMatchSnapshot('rsa-set');
        expect(asSnapshotSafe(scene.unlockResult.stdout)).toMatchSnapshot(
          'rsa-unlock',
        );
      });

      then('the age-cli posture banner is pinned on the SUCCESS path too', () => {
        // the age-cli-strip posture banner fires on stderr for EVERY passphrased
        // age-cli unlock — the success path AND the failure path. case9 pins it on
        // the wrong-passphrase FAILURE path only; without this assertion the SUCCESS
        // path — the moment most rsa users actually see it — had no snapshot, so a
        // refactor could silently drop or garble the "does NOT carry the zero-reuse
        // guarantee" posture on success and no test would catch it, even though the
        // identical text is protected on failure (r10 i043 blocker;
        // rule.forbid.friction-hazards). pin it the SAME way the ed25519 path pins its
        // 🔐 banner (lines 250-257): isolate the 🔓 line so the adjacent
        // machine-specific askpass paths cannot taint the snapshot.
        // .note = the banner is key-type-NEUTRAL — it names the age-cli PATH, not
        //   (rsa/ecdsa), because a v0 legacy ed25519 manifest also rides it on its
        //   first (fix-forward) unlock, and an ed25519 user must not read "(rsa/ecdsa)"
        expect(scene.unlockResult.stderr).toContain('🔓 unlock via age-cli');
        const asAgeCliBannerLine = (stderr: string): string =>
          stderr
            .split('\n')
            .find((line) => line.includes('🔓 unlock via age-cli')) ?? '';
        expect(asAgeCliBannerLine(scene.unlockResult.stderr)).toMatchSnapshot(
          'rsa-unlock-posture-banner',
        );
      });

      then('the fake dialog was invoked (prompt went through the seam, not the tty)', () => {
        // the log exists only if the fake askpass ran — proof the rsa passphrase was
        // typed into the dialog seam (via ssh-keygen -p), never age's tty prompt: the
        // exact garbled-prompt UX the wish set out to kill, now fixed for rsa too
        expect(existsSync(scene.askpassLog)).toBe(true);
        const invocations = readFileSync(scene.askpassLog, 'utf8')
          .split('\n')
          .filter((line) => line === 'invoked');
        // set + unlock each strip once (init is pubkey-only encrypt, no prompt)
        expect(invocations.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  /**
   * [uc8] a passphrased RSA key on a HEADLESS session — the CLI/acceptance parity for the
   * rsa/ecdsa headless fail-fast guard (r10 i039 3.1). ed25519's case4 pins this at the
   * compiled-CLI layer; rsa only had integration coverage. rsa init is pubkey-only (no
   * decrypt, no prompt), so it seals fine even headless; the guard fires on UNLOCK, which
   * must decrypt the manifest via the dialog-strip fallback — and with no display + no
   * KEYRACK_ASKPASS there is no way to prompt, so it must fail fast with the DEDICATED
   * headless guidance, not the merged three-cause strip message
   */
  given('[case8] passphrased rsa key, headless unlock (no DISPLAY, no dialog)', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'rsa-headless',
      });

      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const { path: prikeyPath } = genSampleRsaKey({
        keyPath: join(keyDir, 'passphrased_rsa'),
        passphrase: PASSPHRASE,
      });

      // init seals to the rsa pubkey recipient — pubkey-only, so it needs no dialog and
      // succeeds even headless. use a working dialog here just to keep init hermetic
      const { path: askpassPath } = genSampleAskpassDialog({
        path: join(repo.path, 'fake-askpass.sh'),
        passphrase: PASSPHRASE,
      });

      const initResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: { HOME: repo.path, KEYRACK_ASKPASS: askpassPath },
      });

      // now attempt unlock HEADLESS: no display + no KEYRACK_ASKPASS. the manifest decrypt
      // (dialog-strip fallback) has no way to prompt → the headless guard must fire
      const unlockResult = await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'unlock',
          '--owner',
          'robot',
          '--prikey',
          prikeyPath,
          '--env',
          'sudo',
          '--key',
          'testorg.sudo.ANY_KEY',
        ],
        cwd: repo.path,
        env: {
          HOME: repo.path,
          DISPLAY: undefined,
          WAYLAND_DISPLAY: undefined,
        },
        logOnError: false,
      });

      return { initResult, unlockResult };
    });

    when('[t0] unlock runs headless with a passphrased rsa key', () => {
      then('init succeeded (pubkey-only seal needs no dialog)', () => {
        expect(scene.initResult.status).toEqual(0);
      });

      then('unlock fails with exit code 2 (caller-fixable ConstraintError)', () => {
        expect(scene.unlockResult.status).toEqual(2);
      });

      then('the error names the no-display cause + fixes, distinctly', () => {
        const output = scene.unlockResult.stdout + scene.unlockResult.stderr;
        // the SAME dedicated headless diagnosis the ed25519 path gives — no display,
        // run local, or use a passphrase-less key
        expect(output).toContain('no display');
        expect(output).toContain('local desktop');
        expect(output).toContain('passphrase-less key');
        // NOT the merged three-cause ssh-keygen strip message — the guard fires first
        expect(output).not.toContain('was wrong or cancelled');
        expect(asSnapshotSafe(output)).toMatchSnapshot('rsa-headless');
      });
    });
  });

  /**
   * [uc9] a passphrased RSA key whose dialog supplies the WRONG passphrase — the
   * rsa/ecdsa twin of case2 (ed25519 cancelled). ed25519 had wrong/cancelled coverage;
   * rsa only had happy-path + headless (r10 i041). rsa decrypts via the dialog-strip
   * fallback (ssh-keygen -p), so a wrong passphrase makes the strip fail — which must
   * present as a caller-fixable ConstraintError (exit 2) that names the wrong/cancelled
   * cause, NOT a raw ssh-keygen crash. init is pubkey-only (no strip), so it seals fine;
   * the wrong-passphrase failure fires on UNLOCK, where the manifest must be decrypted
   */
  given('[case9] passphrased rsa key, dialog gives the WRONG passphrase', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'rsa-wrong-passphrase',
      });

      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const { path: prikeyPath } = genSampleRsaKey({
        keyPath: join(keyDir, 'passphrased_rsa'),
        passphrase: PASSPHRASE,
      });

      // init with the CORRECT dialog — rsa init is pubkey-only (no strip, no prompt),
      // so it seals to the rsa recipient regardless; a working dialog keeps it hermetic
      const { path: okAskpassPath } = genSampleAskpassDialog({
        path: join(repo.path, 'ok-askpass.sh'),
        passphrase: PASSPHRASE,
      });

      const initResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: { HOME: repo.path, KEYRACK_ASKPASS: okAskpassPath },
      });

      // a dialog that echoes the WRONG passphrase — ssh-keygen -p (the strip) will
      // reject it, so the manifest decrypt cannot proceed. this is the strip failing on
      // a bad passphrase via the dialog seam, never a tty fallback
      const { path: wrongAskpassPath } = genSampleAskpassDialog({
        path: join(repo.path, 'wrong-askpass.sh'),
        passphrase: 'this-is-the-wrong-passphrase',
      });

      const unlockResult = await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'unlock',
          '--owner',
          'robot',
          '--prikey',
          prikeyPath,
          '--env',
          'sudo',
          '--key',
          'testorg.sudo.ANY_KEY',
        ],
        cwd: repo.path,
        env: { HOME: repo.path, KEYRACK_ASKPASS: wrongAskpassPath },
        logOnError: false,
      });

      return { initResult, unlockResult };
    });

    when('[t0] unlock runs with the wrong-passphrase dialog', () => {
      then('init succeeded (pubkey-only seal needs no strip)', () => {
        expect(scene.initResult.status).toEqual(0);
      });

      then('unlock fails with exit code 2 (caller-fixable ConstraintError)', () => {
        // a wrong/cancelled passphrase is caller-fixable → exit 2 (asExecFailureError
        // classifies the numeric ssh-keygen reject as a ConstraintError), matching the
        // ed25519 cancelled case2 exit-code contract (rule.require.exit-code-semantics)
        expect(scene.unlockResult.status).toEqual(2);
      });

      then('the error names the wrong/cancelled cause, not a raw ssh-keygen crash', () => {
        const output = scene.unlockResult.stdout + scene.unlockResult.stderr;
        // the caller-fixable text a human sees on a mistyped rsa passphrase — names
        // the wrong/cancelled cause plainly, never a bare stack trace
        expect(output).toContain('could not decrypt the key');
        expect(output).toContain('passphrase was wrong or cancelled');
        expect(asSnapshotSafe(output)).toMatchSnapshot('rsa-wrong-passphrase');
      });
    });
  });

  /**
   * [uc10] a passphrased FIDO/sk- key, named EXPLICITLY via --prikey — the blackbox/CLI
   * proof of the FIDO fail-fast (r10 i041). the FIDO limit was proven in-process
   * (sshPrikeyToAgeIdentity.cli.integration case6), but the message a real user sees
   * through the compiled CLI was never pinned — and in fact was SWALLOWED: an explicit
   * --prikey routes through asAgeIdentityResult, which surfaced a hint ONLY for the
   * age-cli-absent miss, so the FIDO fix was dropped to a generic "no identity" error.
   * this case pins the fixed behavior: --prikey <fido> fails fast with exit 2 and the
   * FIDO swap-key fix, the exact message the vision promises (rule.require.errors-name-the-fix)
   */
  given('[case10] passphrased FIDO/sk- key, explicit --prikey fails fast', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'fido',
      });

      // seal the manifest to a passphrase-LESS ed25519 key at a custom path (so it is
      // NOT in ~/.ssh discovery). the FIDO key at unlock is the ONLY prescribed key and
      // cannot decrypt, so no identity matches → the FIDO hint is the surfaced fix
      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const sealKeyPath = join(keyDir, 'seal_key');
      genSampleSshKey({ keyPath: sealKeyPath }); // passphrase-less

      const initResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', sealKeyPath],
        cwd: repo.path,
        env: { HOME: repo.path },
      });

      // a synthetic passphrased FIDO/sk- key — the type token alone drives the branch
      const fidoKeyPath = join(keyDir, 'id_ed25519_sk');
      writeFileSync(
        fidoKeyPath,
        asSyntheticOpensshKeyPem({
          cipher: 'aes256-ctr',
          keyType: 'sk-ssh-ed25519@openssh.com',
        }),
        { mode: 0o600 },
      );

      // unlock naming ONLY the FIDO key via --prikey — it cannot back any unlock path,
      // and no other key decrypts, so the FIDO fix must surface (not a generic miss)
      const unlockResult = await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'unlock',
          '--owner',
          'robot',
          '--prikey',
          fidoKeyPath,
          '--env',
          'sudo',
          '--key',
          'testorg.sudo.ANY_KEY',
        ],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });

      return { initResult, unlockResult };
    });

    when('[t0] unlock runs with an explicit FIDO --prikey', () => {
      then('init succeeded (sealed to the passphrase-less ed25519 key)', () => {
        expect(scene.initResult.status).toEqual(0);
      });

      then('unlock fails with exit code 2 (caller-fixable ConstraintError)', () => {
        // FIDO-in-v1 is caller-fixable (swap the key type) → exit 2, not a server
        // malfunction (rule.require.exit-code-semantics)
        expect(scene.unlockResult.status).toEqual(2);
      });

      then('the error names the FIDO limit + the swap-key fix, not a generic miss', () => {
        const output = scene.unlockResult.stdout + scene.unlockResult.stderr;
        // the vision-promised FIDO fail-fast: names FIDO + a key keyrack CAN serve
        // (an ed25519 or passphrase-less key), NOT the generic "no identity could
        // decrypt … use --prikey" (the human DID use --prikey — the real fix is a
        // different key type). this is the message the pre-fix code swallowed
        expect(output).toContain('FIDO');
        expect(output).toContain('ed25519');
        expect(output).toContain('rhx keyrack init');
        // NOT the daemon cache — it only holds a grant AFTER a successful unlock, so a
        // FIDO-only user can never reach it
        expect(output).not.toContain('daemon-cache fallback');
        expect(asSnapshotSafe(output)).toMatchSnapshot('fido-unsupported');
      });
    });
  });

  /**
   * [uc11] the wisher's core security property (vision u3 / q5): each unlock spawns
   * its OWN ephemeral agent and reaps it on exit, so the loaded key never outlives
   * the one invocation and no other process can reuse it. proven across TWO separate
   * compiled-CLI unlock processes: each prompts + spawns its own agent, and no agent
   * socket dir is left behind after either process exits
   *
   * .note = the ephemeral agent's socket dir (kr-agent-*) lives under os.tmpdir(),
   *         which honors TMPDIR — so a per-test TMPDIR scopes the scan hermetically:
   *         any kr-agent-* dir under it is from THIS test's unlock processes alone
   */
  given('[case11] two separate unlock processes each spawn + reap their OWN agent (zero reuse)', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'zero-reuse',
      });

      // a hermetic TMPDIR so the ephemeral-agent socket dirs (kr-agent-*) are scoped
      // to THIS test — the agent uses os.tmpdir(), which honors TMPDIR
      const agentTmp = join(repo.path, 'agent-tmp');
      mkdirSync(agentTmp, { recursive: true });

      // a passphrase-PROTECTED ed25519 key — the Variant A path, the one that DOES
      // carry the ephemeral zero-reuse guarantee this case proves
      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const prikeyPath = join(keyDir, 'passphrased_key');
      genSampleSshKey({ keyPath: prikeyPath, passphrase: PASSPHRASE });

      // a fake askpass dialog: records each invocation, then echoes the passphrase
      const askpassLog = join(repo.path, 'askpass.invoked.log');
      const { path: askpassPath } = genSampleAskpassDialog({
        path: join(repo.path, 'fake-askpass.sh'),
        passphrase: PASSPHRASE,
        logPath: askpassLog,
      });

      const env = {
        HOME: repo.path,
        KEYRACK_ASKPASS: askpassPath,
        TMPDIR: agentTmp,
      };

      // one 'invoked' line per prompt — a count lets each unlock's OWN prompt be asserted
      const countPrompts = (): number =>
        existsSync(askpassLog)
          ? readFileSync(askpassLog, 'utf8')
              .split('\n')
              .filter((line) => line === 'invoked').length
          : 0;

      // ephemeral-agent socket dirs still present under the hermetic TMPDIR — zero
      // means every spawned agent was reaped on process exit (the teardown net)
      const countAgentDirs = (): number =>
        readdirSync(agentTmp).filter((name) => name.startsWith('kr-agent-'))
          .length;

      // init + set so unlock has a credential to grant
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env,
      });
      await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'set',
          '--key',
          'ZERO_REUSE',
          '--env',
          'sudo',
          '--org',
          'testorg',
          '--mech',
          'PERMANENT_VIA_REPLICA',
          '--vault',
          'os.secure',
          '--owner',
          'robot',
          '--prikey',
          prikeyPath,
        ],
        cwd: repo.path,
        env,
        stdin: 'zero-reuse-secret\n',
      });

      const unlockArgs = [
        'keyrack',
        'unlock',
        '--owner',
        'robot',
        '--prikey',
        prikeyPath,
        '--env',
        'sudo',
        '--key',
        'testorg.sudo.ZERO_REUSE',
      ];

      // FIRST unlock process
      const promptsBeforeUnlock1 = countPrompts();
      const unlock1 = await invokeRhachetCliBinary({
        args: unlockArgs,
        cwd: repo.path,
        env,
      });
      const promptsAfterUnlock1 = countPrompts();
      // scan AFTER the process has fully exited (spawnSync awaits exit) — the exit
      // teardown net has already run, so any kr-agent-* dir left is a leak
      const agentDirsAfterUnlock1 = countAgentDirs();

      // SECOND unlock process — wholly separate; it CANNOT reach unlock1's reaped
      // agent, so it must spawn + load its own (proven by its own fresh prompt)
      const unlock2 = await invokeRhachetCliBinary({
        args: unlockArgs,
        cwd: repo.path,
        env,
      });
      const promptsAfterUnlock2 = countPrompts();
      const agentDirsAfterUnlock2 = countAgentDirs();

      return {
        unlock1,
        unlock2,
        promptsBeforeUnlock1,
        promptsAfterUnlock1,
        promptsAfterUnlock2,
        agentDirsAfterUnlock1,
        agentDirsAfterUnlock2,
      };
    });

    when('[t0] two independent unlock processes run in sequence', () => {
      then('both unlock processes succeed independently', () => {
        expect(scene.unlock1.status).toEqual(0);
        expect(scene.unlock2.status).toEqual(0);
      });

      then('each unlock prompts its OWN agent (no cached-agent reuse)', () => {
        // unlock1 prompts once (loads its own ephemeral agent)
        expect(scene.promptsAfterUnlock1).toBeGreaterThan(
          scene.promptsBeforeUnlock1,
        );
        // unlock2 prompts AGAIN — it could not borrow unlock1's torn-down agent, so
        // it spawned + loaded a fresh one (the zero-reuse property, seen via the dialog)
        expect(scene.promptsAfterUnlock2).toBeGreaterThan(
          scene.promptsAfterUnlock1,
        );
      });

      then('no ephemeral agent socket dir is left after either process exits', () => {
        // the agent that held the key is reaped on process exit, so its 0700 socket
        // dir is gone — no other process can reach it to reuse the key (vision u3/q5)
        expect(scene.agentDirsAfterUnlock1).toEqual(0);
        expect(scene.agentDirsAfterUnlock2).toEqual(0);
      });
    });
  });

  /**
   * [uc12] a wrong/cancelled passphrase fails loud on the FIRST unlock run, and a
   * SECOND run fails loud identically — the vision's "no in-place retry loop"
   * contract (the corrected edgecase row): the load fails on the first bad attempt,
   * the user re-runs, and each run re-fires the dialog FRESH with NO stale/cached
   * state carried between the two ephemeral, zero-reuse invocations.
   *
   * .why  = case2/case9 prove only the FIRST bad attempt. this proves the SECOND run
   *         is clean too — the dialog re-fires and the same caller-fixable exit 2 +
   *         message recurs, so a bad passphrase never leaves a poisoned agent or a
   *         cached reject that corrupts the next honest retry
   *
   * .note = the dialog CANCELS (exit 1), exactly as case2 does — the clean fail path.
   *         a dialog that instead echoed a persistently-WRONG value would make ssh-add
   *         re-prompt in a tight retry loop (a messy, count-unstable path that does not
   *         model "the user re-runs the command"); the cancel path isolates the
   *         re-run-is-clean claim this case is about
   */
  given('[case12] wrong/cancelled passphrase fails loud on two consecutive unlock runs', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'passphrase-bad-twice',
      });

      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const prikeyPath = join(keyDir, 'passphrased_key');
      genSampleSshKey({ keyPath: prikeyPath, passphrase: PASSPHRASE });

      // a CORRECT dialog for init — so a manifest exists to unlock against
      const { path: okAskpass } = genSampleAskpassDialog({
        path: join(repo.path, 'ok-askpass.sh'),
        passphrase: PASSPHRASE,
      });

      // a CANCEL dialog for unlock: it records each invocation, then exits non-zero
      // (the human hit "cancel"), so ssh-add cannot load the key — the clean fail
      // path case2 already proves, re-used here to isolate the two-run claim
      const badLog = join(repo.path, 'bad-askpass.invoked.log');
      const badAskpass = join(repo.path, 'bad-askpass.sh');
      writeFileSync(
        badAskpass,
        [
          '#!/usr/bin/env bash',
          `echo invoked >> '${badLog}'`,
          'exit 1',
          '',
        ].join('\n'),
      );
      chmodSync(badAskpass, 0o755);

      const countBadPrompts = (): number =>
        existsSync(badLog)
          ? readFileSync(badLog, 'utf8')
              .split('\n')
              .filter((line) => line === 'invoked').length
          : 0;

      // init with the CORRECT dialog → a manifest to unlock against
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env: { HOME: repo.path, KEYRACK_ASKPASS: okAskpass },
      });

      const unlockArgs = [
        'keyrack',
        'unlock',
        '--owner',
        'robot',
        '--prikey',
        prikeyPath,
        '--env',
        'sudo',
        '--key',
        'testorg.sudo.ANY_KEY',
      ];
      const badEnv = { HOME: repo.path, KEYRACK_ASKPASS: badAskpass };

      // FIRST bad-passphrase unlock run
      const attempt1 = await invokeRhachetCliBinary({
        args: unlockArgs,
        cwd: repo.path,
        env: badEnv,
        logOnError: false,
      });
      const promptsAfterAttempt1 = countBadPrompts();

      // SECOND bad-passphrase unlock run — a wholly fresh process; it must re-fire
      // the dialog and fail loud the SAME way, with no stale/cached reject carried over
      const attempt2 = await invokeRhachetCliBinary({
        args: unlockArgs,
        cwd: repo.path,
        env: badEnv,
        logOnError: false,
      });
      const promptsAfterAttempt2 = countBadPrompts();

      return { attempt1, attempt2, promptsAfterAttempt1, promptsAfterAttempt2 };
    });

    when('[t0] two consecutive unlock runs each get a cancelled dialog', () => {
      then('the first attempt fails loud with exit 2 (caller-fixable)', () => {
        expect(scene.attempt1.status).toEqual(2);
        const output = scene.attempt1.stdout + scene.attempt1.stderr;
        expect(output).toContain('ssh-add could not load the key');
        expect(output).toContain('passphrase was wrong or cancelled');
      });

      then('the second run fails loud identically — no stale/cached state', () => {
        // the key contract of "no in-place retry": the second RUN behaves exactly
        // like the first (same exit, same message), so a bad passphrase never
        // poisons the next honest retry
        expect(scene.attempt2.status).toEqual(2);
        const output = scene.attempt2.stdout + scene.attempt2.stderr;
        expect(output).toContain('ssh-add could not load the key');
        expect(output).toContain('passphrase was wrong or cancelled');
      });

      then('each run re-fired the dialog fresh (no cached-agent reuse)', () => {
        // the second run prompted AGAIN — it did NOT reuse a cached agent or a prior
        // reject; it spawned its own ephemeral agent and re-fired the dialog (zero
        // reuse). exact counts are not pinned (ssh-add may retry a cancel internally);
        // the claim is that each run fires the dialog at least once, and run 2 adds more
        expect(scene.promptsAfterAttempt1).toBeGreaterThan(0);
        expect(scene.promptsAfterAttempt2).toBeGreaterThan(
          scene.promptsAfterAttempt1,
        );
      });
    });
  });

  /**
   * [uc13] `keyrack unlock --help` documents the KEYRACK_ASKPASS override seam
   * the env-doc block is the ONLY place the human learns how to point keyrack at a
   * non-gnome or relocated askpass dialog. a --help snapshot pins that human-visible
   * doc contract so a drop or drift of the KEYRACK_ASKPASS text is caught in review
   */
  given('[case13] keyrack unlock --help documents the KEYRACK_ASKPASS seam', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'unlock-help',
      });

      // --help short-circuits in commander before the action runs, so no manifest or
      // key state is needed — this pins the pure doc surface
      const helpResult = await invokeRhachetCliBinary({
        args: ['keyrack', 'unlock', '--help'],
        cwd: repo.path,
        env: { HOME: repo.path },
        logOnError: false,
      });

      return { helpResult };
    });

    when('[t0] the human asks for unlock help', () => {
      then('help exits 0 (a query, never a failure)', () => {
        expect(scene.helpResult.status).toEqual(0);
      });

      then('the KEYRACK_ASKPASS override + keylogger-mitigation doc is present', () => {
        const output = scene.helpResult.stdout + scene.helpResult.stderr;
        expect(output).toContain('KEYRACK_ASKPASS');
        expect(output).toContain('ssh-askpass-gnome');
        expect(output).toContain('keylogger mitigation');
      });

      then('the help output stays pinned (contract-grain snapshot)', () => {
        // pin the human-visible --help surface as rendered through the compiled binary,
        // so a drop, reorder, or text drift of the KEYRACK_ASKPASS env doc is caught in
        // review (r9 gap: the env-doc block had assertions elsewhere but no --help snap)
        expect(asSnapshotSafe(scene.helpResult.stdout)).toMatchSnapshot('unlock-help');
      });
    });
  });
});
