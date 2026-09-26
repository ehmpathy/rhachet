import * as age from 'age-encryption';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * keyrack re-init message acceptance test
 *
 * proves the compiled CLI surfaces the "re-initialize" fix when a host manifest is
 * sealed to a recipient no available identity can open — the pubkey-derived age1 seal
 * a passphrased key produces, which the native-dialog unlock cannot open in-process
 * and which `--prikey` cannot help. this is the CLI-grain twin of
 * daoKeyrackHostManifest case15 (which pins the generic no-identity re-init message at
 * the domain grain).
 *
 * .why = every peer first-contact fail-fast message that is hermetically drivable through
 *        the compiled binary (askpass-absent, headless, FIDO) has compiled-CLI coverage;
 *        this re-init message — the one a real user hits on a legacy/mismatched manifest —
 *        was the one gap without it (r10 i057). the install-age message is the deliberate
 *        exception: a compiled-binary run of it needs a curated PATH that omits `age` yet
 *        keeps node/ssh-keygen/which (age sits beside them in the system bins), which is
 *        fragile — so it stays integration-covered (sshPrikeyToAgeIdentity.cli +
 *        genContextKeyrack integration tests call the code in-process, where an absent age
 *        is clean to simulate) — the same grain-choice the migration path documents (r9 i005).
 *
 * .note = hermetic: the manifest is a REAL age ciphertext sealed to a throwaway X25519
 *        recipient nobody holds. age parses its header, whatever identity the host
 *        discovers cleanly MISSES it (the expected recipient-miss, not a crash), and the
 *        dao reaches its no-identity branch and throws the re-init ConstraintError — all
 *        with no age-cli, no tty, no passphrase prompt.
 * .note = an ssh-ed25519-sealed variant (the case13 early branch) is NOT drivable here:
 *        a hand-crafted ssh header is not a real seal (age's stanza parser rejects it),
 *        and a REAL ssh seal needs the age-cli/tty path the vision documents as
 *        un-hermetic. this X25519 seal reaches the SAME re-init fix via the generic
 *        branch, so the user-faced message is covered at the CLI grain regardless.
 */
describe('keyrack re-init message (manifest sealed to an unheld recipient)', () => {
  given('[case1] a manifest no available identity can decrypt', () => {
    const owner = 'reinitprobe';

    const repo = useBeforeAll(async () => {
      const created = await genTestTempRepo({ fixture: 'with-vault-os-direct' });

      // seed ONLY the crafted host manifest for this owner — deliberately NO init. the
      // seal is REAL age (so age parses it), but to a throwaway recipient nobody holds,
      // so whatever identity the host discovers cleanly misses it and the flow reaches
      // the dao's no-identity branch → the re-init ConstraintError
      const keyrackDir = join(created.path, '.rhachet', 'keyrack');
      if (!existsSync(keyrackDir)) mkdirSync(keyrackDir, { recursive: true });

      const throwawayIdentity = await age.generateIdentity();
      const throwawayRecipient = await age.identityToRecipient(throwawayIdentity);
      const encrypter = new age.Encrypter();
      encrypter.addRecipient(throwawayRecipient);
      const ciphertextBytes = await encrypter.encrypt(
        'unreachable-manifest-plaintext',
      );
      const sealedCiphertext = age.armor.encode(ciphertextBytes);

      writeFileSync(
        join(keyrackDir, `keyrack.host.${owner}.age`),
        sealedCiphertext,
        'utf8',
      );

      return created;
    });

    when('[t0] rhx keyrack unlock --owner reinitprobe --env test', () => {
      const result = useThen('the CLI completes', () =>
        invokeRhachetCliBinary({
          binary: 'rhx',
          args: ['keyrack', 'unlock', '--owner', owner, '--env', 'test'],
          cwd: repo.path,
          env: { HOME: repo.path },
          // the re-init path exits non-zero by design — do NOT treat that as a harness
          // error, this test asserts the message on the failure output itself
          logOnError: false,
        }),
      );

      then('it fails (a caller-fixable constraint, never a silent pass)', () => {
        expect(result.status).not.toEqual(0);
      });

      then('the output names re-init as the fix, not just the --prikey misdirect', () => {
        const output = `${result.stdout}\n${result.stderr}`;
        expect(output).toContain('re-init');
        expect(output).toContain('rhx keyrack init');
      });

      then('the surfaced CLI error shape stays pinned (contract-grain snapshot)', () => {
        // pin the human-visible failure as rendered through the compiled binary — the
        // same message is snapped at the domain grain (daoKeyrackHostManifest case15),
        // but a drop/reorder/text-drift of the banner or error THROUGH the CLI would
        // sail past the domain snap; this pins the contract surface a real user sees.
        // concat stdout + stderr with NO separator (the peer error-case pattern) so an
        // empty stdout never prepends a stray blank; asSnapshotSafe strips the random
        // temp-repo path so it cannot flake
        const output = result.stdout + result.stderr;
        expect(asSnapshotSafe(output)).toMatchSnapshot('reinit-message');
      });
    });
  });
});
