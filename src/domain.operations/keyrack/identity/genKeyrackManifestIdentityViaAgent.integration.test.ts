import * as age from 'age-encryption';
import { HelpfulError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleEphemeralSshKey } from '@src/.test/assets/genSampleEphemeralSshKey';
import { asAgeKeyPairFromSeed } from '@src/infra/ssh/ageRecipientCrypto';
import { genEphemeralSshAgent } from '@src/infra/ssh/genEphemeralSshAgent';
import { isSshAgentAvailable } from '@src/infra/ssh/isSshAgentAvailable';

import { execFileSync } from 'node:child_process';
import { asKeyrackUnlockChallenge } from './asKeyrackUnlockChallenge';
import { genKeyrackManifestIdentityViaAgent } from './genKeyrackManifestIdentityViaAgent';
import { getOneAgentSignature } from './getOneAgentSignature';
import { getOneWrapKey } from './getOneWrapKey';

/**
 * .what = prove the unlock-side orchestrator re-derives K end-to-end: it spawns its
 *         own ephemeral agent, loads the key, signs, derives K from the signature
 *         seed, and the re-derived K decrypts a manifest — then the agent is gone
 * .why  = this is the exact op the live unlock composes into; a proof here means the
 *         wire-up is a call, not new logic. derive-not-store: K is re-derived from the
 *         signature seed, NEVER unwrapped from a stored secret — no wrappedK, no sidecar
 *
 * .note = integration (real ephemeral agents, real key, real age); self-isolated.
 *         the key is passphrase-less so the dialog is never invoked; a stand-in
 *         askpass candidate satisfies detection
 */
describe('genKeyrackManifestIdentityViaAgent', () => {
  if (!isSshAgentAvailable())
    throw new Error(
      'ssh-agent is required for this integration test — install openssh-client',
    );

  const scene = useBeforeAll(async () => {
    // a throwaway passphrase-less ed25519 key kept on disk (the orchestrator
    // spawns its own agent and loads it by path); the dialog is a stand-in a
    // passphrase-less key never invokes
    const { keyPath, pubkeyPath, dialog } = genSampleEphemeralSshKey();

    const owner = 'ehmpath';

    // init side (derive-not-store): derive the signature seed via a throwaway agent
    // (as init would), derive K's recipient from it, encrypt a manifest to it. NO
    // secret is stored — the same seed re-derives the same K at unlock
    const initAgent = genEphemeralSshAgent({ owner });
    execFileSync('ssh-add', [keyPath], {
      stdio: 'pipe',
      timeout: 30_000,
      env: { ...process.env, SSH_AUTH_SOCK: initAgent.sock },
    });
    const seed = getOneWrapKey({
      signature: getOneAgentSignature({
        sock: initAgent.sock,
        pubkeyPath,
        challenge: asKeyrackUnlockChallenge({ owner }),
      }),
    });
    initAgent.teardown();
    const { recipient: recipientK } = await asAgeKeyPairFromSeed({ seed });

    const encrypter = new age.Encrypter();
    encrypter.addRecipient(recipientK);
    const manifest = 'ehmpathy.test.XAI_API_KEY=super-secret-value';
    const manifestSealed = age.armor.encode(await encrypter.encrypt(manifest));

    return { owner, keyPath, pubkeyPath, dialog, manifestSealed, manifest };
  });

  given(
    '[case1] the owner ssh key on disk + a manifest sealed to derived K',
    () => {
      when(
        '[t0] the orchestrator re-derives K via its own ephemeral agent',
        () => {
          then('the re-derived K decrypts the manifest', async () => {
            const { identity: recoveredK } =
              await genKeyrackManifestIdentityViaAgent({
                owner: scene.owner,
                keyPath: scene.keyPath,
                pubkeyPath: scene.pubkeyPath,
                askpassCandidates: [scene.dialog],
              });

            const decrypter = new age.Decrypter();
            decrypter.addIdentity(recoveredK);
            const decrypted = await decrypter.decrypt(
              age.armor.decode(scene.manifestSealed),
              'text',
            );
            expect(decrypted).toEqual(scene.manifest);
          });
        },
      );

      when('[t1] no askpass dialog is available', () => {
        then(
          'it fails fast with the install fix (never a tty prompt)',
          async () => {
            // getError captures the throw without a mutable latch (immutable-vars)
            const error = await getError(
              genKeyrackManifestIdentityViaAgent({
                owner: scene.owner,
                keyPath: scene.keyPath,
                pubkeyPath: scene.pubkeyPath,
                // a FIXED nonexistent path so the snapped error stays deterministic
                askpassCandidates: ['/nonexistent/gnome-ssh-askpass'],
              }),
            );
            expect(error.message).toContain(
              'sudo apt install ssh-askpass-gnome',
            );
            // snap the full user-faced message so its exact text cannot drift
            expect(error.message).toMatchSnapshot();
          },
        );
      });
    },
  );

  given(
    '[case2] zero reuse — the loaded key never outlives one invocation (vision q5)',
    () => {
      // a fresh, isolated scene: its own key + manifest, so removal here cannot
      // disturb case1. the orchestrator spawns AND tears down its own ephemeral
      // agent inside each call, so there is no persistent socket to reuse between
      // invocations — this proves it: after one unlock the key is removed, and a
      // later unlock cannot lean on a leftover agent, it must reload and fails loud
      const scene2 = useBeforeAll(async () => {
        const { keyPath, pubkeyPath, dialog } = genSampleEphemeralSshKey();
        const owner = 'ehmpath';

        const initAgent = genEphemeralSshAgent({ owner });
        execFileSync('ssh-add', [keyPath], {
          stdio: 'pipe',
          timeout: 30_000,
          env: { ...process.env, SSH_AUTH_SOCK: initAgent.sock },
        });
        const seed = getOneWrapKey({
          signature: getOneAgentSignature({
            sock: initAgent.sock,
            pubkeyPath,
            challenge: asKeyrackUnlockChallenge({ owner }),
          }),
        });
        initAgent.teardown();
        const { recipient: recipientK } = await asAgeKeyPairFromSeed({ seed });

        const encrypter = new age.Encrypter();
        encrypter.addRecipient(recipientK);
        const manifest = 'ehmpathy.test.XAI_API_KEY=super-secret-value';
        const manifestSealed = age.armor.encode(
          await encrypter.encrypt(manifest),
        );

        return { owner, keyPath, pubkeyPath, dialog, manifestSealed };
      });

      when(
        '[t0] one unlock succeeds, then the key is removed from disk',
        () => {
          then(
            'a later unlock fails loud — no agent or key outlived the first call',
            async () => {
              // first unlock succeeds; the orchestrator spawns + tears down its
              // own agent, so it does not persist once the call returns
              const { identity: recoveredK } =
                await genKeyrackManifestIdentityViaAgent({
                  owner: scene2.owner,
                  keyPath: scene2.keyPath,
                  pubkeyPath: scene2.pubkeyPath,
                  askpassCandidates: [scene2.dialog],
                });
              const decrypter = new age.Decrypter();
              decrypter.addIdentity(recoveredK);
              expect(
                await decrypter.decrypt(
                  age.armor.decode(scene2.manifestSealed),
                  'text',
                ),
              ).toContain('super-secret-value');

              // remove the key — with zero reuse, no leftover agent holds it, so
              // the next unlock has no fallback and must reload from disk
              execFileSync('mv', [scene2.keyPath, `${scene2.keyPath}.away`], {
                stdio: 'pipe',
                timeout: 30_000,
              });

              // the later unlock MUST fail loud (never silently reuse a stale agent
              // or a cached key) — rule.forbid.failhide + the q5 zero-reuse guarantee
              const error = await getError(
                genKeyrackManifestIdentityViaAgent({
                  owner: scene2.owner,
                  keyPath: scene2.keyPath,
                  pubkeyPath: scene2.pubkeyPath,
                  askpassCandidates: [scene2.dialog],
                }),
              );
              expect(error).toBeInstanceOf(HelpfulError);
              expect(error.message).toContain('could not load the key');
            },
          );
        },
      );
    },
  );

  given(
    "[case3] cross-owner K isolation — owner A cannot open owner B's manifest",
    () => {
      // the challenge is owner-scoped (asKeyrackUnlockChallenge keys on owner), so the
      // SAME ssh key that signs two different owners' challenges yields two different
      // signatures → two different seeds → two different K. this is the per-owner
      // isolation the vision's sign-as-KDF leans on: owner A's derived K must not open
      // a manifest sealed to owner B's K, even with the identical key. proven directly
      // here rather than only as a composite of two separate single-owner tests (r10 #10)
      const scene3 = useBeforeAll(async () => {
        const { keyPath, pubkeyPath } = genSampleEphemeralSshKey();

        // derive K for a given owner from the SAME key via a throwaway agent
        const genKeyPairForOwner = async (owner: string) => {
          const agent = genEphemeralSshAgent({ owner });
          execFileSync('ssh-add', [keyPath], {
            stdio: 'pipe',
            timeout: 30_000,
            env: { ...process.env, SSH_AUTH_SOCK: agent.sock },
          });
          const seed = getOneWrapKey({
            signature: getOneAgentSignature({
              sock: agent.sock,
              pubkeyPath,
              challenge: asKeyrackUnlockChallenge({ owner }),
            }),
          });
          agent.teardown();
          return asAgeKeyPairFromSeed({ seed });
        };

        const keyPairA = await genKeyPairForOwner('owner-a');
        const keyPairB = await genKeyPairForOwner('owner-b');

        // seal owner B's manifest to K_B only
        const encrypter = new age.Encrypter();
        encrypter.addRecipient(keyPairB.recipient);
        const manifestB = 'ownerb.test.SECRET=owner-b-only';
        const manifestBSealed = age.armor.encode(
          await encrypter.encrypt(manifestB),
        );

        return { keyPairA, keyPairB, manifestB, manifestBSealed };
      });

      when(
        "[t0] owner A's K is tried against owner B's sealed manifest",
        () => {
          then(
            'the two owners derive DISTINCT K from the identical key (owner-scoped challenge)',
            () => {
              expect(scene3.keyPairA.recipient).not.toEqual(
                scene3.keyPairB.recipient,
              );
              expect(scene3.keyPairA.identity).not.toEqual(
                scene3.keyPairB.identity,
              );
            },
          );

          then(
            "K_A cannot decrypt owner B's manifest — the age library rejects it",
            async () => {
              const decrypterA = new age.Decrypter();
              decrypterA.addIdentity(scene3.keyPairA.identity);
              const error = await getError(
                decrypterA.decrypt(
                  age.armor.decode(scene3.manifestBSealed),
                  'text',
                ),
              );
              // a wrong identity is rejected loud — never a silent empty/garbage decrypt
              // (rule.forbid.failhide); age's canonical miss names no recipient
              expect(error).toBeInstanceOf(Error);
              expect(error.message.toLowerCase()).toContain(
                'no identity matched',
              );
            },
          );

          then(
            "K_B (owner B's true K) decrypts it — positive control",
            async () => {
              const decrypterB = new age.Decrypter();
              decrypterB.addIdentity(scene3.keyPairB.identity);
              const decrypted = await decrypterB.decrypt(
                age.armor.decode(scene3.manifestBSealed),
                'text',
              );
              expect(decrypted).toEqual(scene3.manifestB);
            },
          );
        },
      );
    },
  );
});
