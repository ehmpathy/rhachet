import { given, then, useBeforeAll, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { genSampleAskpassDialog } from '@src/.test/assets/genSampleAskpassDialog';
import { genSampleEphemeralSshKey } from '@src/.test/assets/genSampleEphemeralSshKey';
import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { KeyrackKeyRecipient } from '@src/domain.objects/keyrack';
import { asAgeRecipientFromSshPubkey } from '@src/infra/ssh/asAgeRecipientFromSshPubkey';
import { getOneSshPubkey } from '@src/infra/ssh/getOneSshPubkey';
import { isSshAgentAvailable } from '@src/infra/ssh/isSshAgentAvailable';

import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { genContextKeyrack } from './genContextKeyrack';
import { migrateKeyrackManifestToVariantA } from './migrateKeyrackManifestToVariantA';

/**
 * .what = prove the seamless legacy→derive-not-store fix-forward end-to-end: a manifest
 *         sealed to the ssh-pubkey-derived age1 recipient is re-sealed to the derived
 *         identity K on unlock, every legacy recipient dropped, hosts preserved, and
 *         the result decrypts via the ephemeral-agent path — with a prompt-free
 *         idempotency gate so a second run is a no-op
 * .why  = a legacy manifest stays on the garbled age-cli tty prompt until it migrates;
 *         this is the acceptance that the first post-upgrade unlock converts it to the
 *         native gnome-dialog UX (the wisher's fix-forward call)
 *
 * .note = integration (real key, real agent, real age library, real fs); self-isolated
 *         via a temp HOME. the scripted askpass echoes the passphrase, so
 *         SSH_ASKPASS_REQUIRE=force drives the re-seal headlessly — the exact path the
 *         gnome dialog takes, minus the human keystroke
 * .note = the legacy hosts here are os.direct (plaintext, not recipient-sealed), so no
 *         age-cli blob decrypt is needed — the os.secure re-key (which needs the session
 *         identity) is proven directly in reKeyOsSecureCredentialsToRecipients's own test
 * .note = the legacy manifest is built directly (encrypted to the age1-from-pubkey
 *         recipient) — current init can no longer PRODUCE this shape for a passphrased
 *         ed25519 key (it goes derive-not-store), so the pre-feature world is
 *         reconstructed here to migrate from
 */

/**
 * .what = run an async fn with console.error captured to a line buffer, restored in finally
 * .why = the ⛵ upgrade banner is a stderr-only status notice (a side-effect, not a return
 *        value), so the only way to assert it fired — and did not silently drop or reorder —
 *        is to observe the stderr sink. this HOF names that read-only capture ONCE so both
 *        migrate cases reuse it instead of a copy-paste closure (rule.require.shared-test-fixtures)
 * .mock = the global console.error (a capture closure, restored in finally) — read-only, NOT
 *         a behavior substitute (rule.forbid.integration.mocks exception)
 * .real = the wrapped fn runs REAL end to end (real age seal, real re-key, real snapshot/
 *         rollback); only the stderr sink is observed
 */
const withCapturedConsoleError = async <T>(
  run: () => Promise<T>,
): Promise<{ result: T; errLines: string[] }> => {
  const errLines: string[] = [];
  const errOriginal = console.error;
  console.error = (...args: unknown[]) => {
    errLines.push(args.map((arg) => String(arg)).join(' '));
  };
  try {
    const result = await run();
    return { result, errLines };
  } finally {
    console.error = errOriginal;
  }
};

describe('migrateKeyrackManifestToVariantA (legacy → derive-not-store fix-forward)', () => {
  if (!isSshAgentAvailable())
    throw new Error(
      'ssh-agent is required for this integration test — install openssh-client',
    );

  const scene = useBeforeAll(async () => {
    const home = mkdtempSync(join(tmpdir(), 'kr-migrate-'));
    const originalHome = process.env.HOME;
    process.env.HOME = home;

    // a real PASSPHRASED ed25519 key (the one migratable legacy shape)
    const passphrase = 'test-passphrase-123';
    const { keyPath } = genSampleEphemeralSshKey({
      dir: home,
      keyName: 'id_probe',
      passphrase,
      comment: 'probe',
    });

    // a real PASSPHRASE-LESS ed25519 key (the not-migratable control)
    const { keyPath: keyPathNoPass } = genSampleEphemeralSshKey({
      dir: home,
      keyName: 'id_nopass',
      comment: 'nopass',
    });

    // a scripted askpass that echoes the passphrase (stands in for the dialog) AND
    // appends a line to a log file on each invocation — so a test can tally how many
    // times the passphrase dialog was fired, a guard on the prompt-count of the
    // migrate re-derive against a regression that adds redundant prompts (r10 nit c)
    const askpassLog = join(home, 'askpass.invocations.log');
    const { path: askpass } = genSampleAskpassDialog({
      path: join(home, 'gnome-ssh-askpass'),
      passphrase,
      logPath: askpassLog,
    });

    return {
      home,
      originalHome,
      keyPath,
      keyPathNoPass,
      askpass,
      askpassLog,
      passphrase,
    };
  });

  afterAll(() => {
    process.env.HOME = scene.originalHome;
  });

  given(
    '[case1] a legacy manifest sealed to the ssh-pubkey age1 recipient',
    () => {
      const legacy = useBeforeAll(async () => {
        const owner = 'ehmpath-legacy';

        // the legacy recipient: the ssh PUBKEY curve-transformed to age1. NOTE this
        // shape is NOT what pre-feature `init` produced for a passphrased key — init
        // sealed a passphrased key to the RAW ssh-ed25519 stanza (age-cli path), and the
        // pubkey-derived age1 recipient only to a PASSWORDLESS key. this passphrased +
        // pubkey-age1 combination arises only via a manual `keyrack recipient set`
        // (which curve-transforms any ssh pubkey to age1). this test drives the migrate
        // function directly on that shape to prove the re-derive/re-seal half; the
        // production reachability of the shape through unlock's get() gate is a separate
        // concern (a passphrased key cannot open a pubkey-age1 seal in-process, so get()
        // routes it to the re-init message — see daoKeyrackHostManifest.get)
        const pubkey = getOneSshPubkey({ keyPath: scene.keyPath });
        const legacyRecipientPubkey = asAgeRecipientFromSshPubkey({ pubkey });

        const manifest = genMockKeyrackHostManifest({
          owner,
          recipients: [
            new KeyrackKeyRecipient({
              mech: 'age',
              pubkey: legacyRecipientPubkey,
              label: 'default',
              addedAt: new Date().toISOString(),
            }),
          ],
          hosts: { 'testorg.test.API_KEY': { vault: 'os.direct' } },
        });

        // persist it (encrypted to the legacy recipient)
        await daoKeyrackHostManifest.set({ upsert: manifest });

        return { owner, legacyRecipientPubkey, manifest };
      });

      when('[t0] migration runs against the decrypted legacy manifest', () => {
        const result = useBeforeAll(async () => {
          const context = genContextKeyrack({
            owner: legacy.owner,
            prikeys: [scene.keyPath],
            askpassCandidates: [scene.askpass],
          });
          // count askpass invocations across JUST the migrate re-derive: read the
          // log line-count before and after, so the delta is this call's prompts
          const countAskpassInvocations = (): number =>
            existsSync(scene.askpassLog)
              ? readFileSync(scene.askpassLog, 'utf8')
                  .split('\n')
                  .filter(Boolean).length
              : 0;
          const promptsBefore = countAskpassInvocations();
          // capture the ⛵ stderr banner via the shared read-only HOF (see its .mock/.why/.real)
          const { result: outcome, errLines } = await withCapturedConsoleError(
            async () =>
              migrateKeyrackManifestToVariantA(
                {
                  owner: legacy.owner,
                  manifest: legacy.manifest,
                  prikey: scene.keyPath,
                  askpassCandidates: [scene.askpass],
                },
                context,
              ),
          );
          const migratePromptCount = countAskpassInvocations() - promptsBefore;
          return { outcome, errLines, migratePromptCount };
        });

        then('it reports migrated = true', () => {
          expect(result.outcome.migrated).toBe(true);
        });

        then(
          'the migrate re-derive prompts EXACTLY once — no redundant prompt (r10 nit c)',
          () => {
            // the Variant A re-derive loads the key into the ephemeral agent one
            // time to sign the challenge for K, so it must fire the dialog exactly
            // once. a regression that re-loads (or re-signs) would push this to 2+
            // and is caught here. NOTE: the FULL legacy-first-unlock double-prompt
            // (pool age-cli strip = 1, then this re-derive = 1) is not hermetically
            // drivable end-to-end (age reads the strip passphrase from the tty, not
            // SSH_ASKPASS — the accepted limit from i027); this pins the re-derive
            // half, the half that IS hermetic
            expect(result.migratePromptCount).toEqual(1);
          },
        );

        then('the ⛵ upgrade banner is announced before the re-seal', () => {
          // the human-visible status notice the vision + migrate decision promise on
          // the first post-upgrade unlock. asserted + snapshot-pinned so a drop or a
          // text/shape drift of the console.error banner cannot slip past unseen
          const bannerLine = result.errLines.find((line) =>
            line.includes('⛵'),
          );
          expect(bannerLine).toContain(
            '⛵ upgrade ehmpath-legacy identity to the ssh-agent unlock',
          );
          expect(bannerLine).toMatchSnapshot('migrate-banner');
        });

        then(
          'the manifest is re-sealed to the derived K recipient (not the legacy one)',
          async () => {
            const context = genContextKeyrack({
              owner: legacy.owner,
              prikeys: [scene.keyPath],
              askpassCandidates: [scene.askpass],
            });
            const reloaded = await daoKeyrackHostManifest.get(
              { owner: legacy.owner },
              context,
            );
            expect(reloaded).not.toEqual(null);
            // exactly one recipient, and it is the derived K — NOT the legacy
            // ssh-derived age1 (hardcut: every legacy recipient dropped)
            expect(reloaded?.manifest.recipients.length).toEqual(1);
            const recipient = reloaded!.manifest.recipients[0]!;
            expect(recipient.mech).toEqual('age');
            expect(recipient.pubkey.startsWith('age1')).toBe(true);
            expect(recipient.pubkey).not.toEqual(legacy.legacyRecipientPubkey);
          },
        );

        then('the hosts are preserved verbatim', async () => {
          const context = genContextKeyrack({
            owner: legacy.owner,
            prikeys: [scene.keyPath],
            askpassCandidates: [scene.askpass],
          });
          const reloaded = await daoKeyrackHostManifest.get(
            { owner: legacy.owner },
            context,
          );
          expect(Object.keys(reloaded!.manifest.hosts)).toEqual([
            'testorg.test.API_KEY',
          ]);
          expect(
            reloaded!.manifest.hosts['testorg.test.API_KEY']?.vault,
          ).toEqual('os.direct');
        });
      });

      when(
        '[t1] migration runs a SECOND time against the reloaded manifest',
        () => {
          const resultSecond = useBeforeAll(async () => {
            const context = genContextKeyrack({
              owner: legacy.owner,
              prikeys: [scene.keyPath],
              askpassCandidates: [scene.askpass],
            });
            // reload the now-migrated manifest (on K) — production passes the freshly
            // loaded manifest, so the prompt-free gate sees no legacy recipient
            const reloaded = await daoKeyrackHostManifest.get(
              { owner: legacy.owner },
              context,
            );
            return migrateKeyrackManifestToVariantA(
              {
                owner: legacy.owner,
                manifest: reloaded!.manifest,
                prikey: scene.keyPath,
                askpassCandidates: [scene.askpass],
              },
              context,
            );
          });

          then(
            'it is a no-op (migrated = false) — the prompt-free legacy-recipient gate holds',
            () => {
              expect(resultSecond.migrated).toBe(false);
            },
          );
        },
      );
    },
  );

  given(
    '[case6] a v0 manifest sealed to a RAW ssh-ed25519 recipient (the pre-feature shape)',
    () => {
      // THE seamless-backcompat shape: a passphrased ed25519 `init` made BEFORE
      // derive-not-store sealed the manifest to a raw `ssh-ed25519` stanza (mech 'ssh',
      // age-cli path), NOT the pubkey-age1 shape case1 drives. this is the manifest a real
      // pre-feature user has on disk. it must migrate seamlessly — the broadened
      // isLegacySsh gate must fire for the raw-ssh recipient. RED before the gate broadened
      // (migrated:false — the raw-ssh recipient never matched the pubkey-age1 check), GREEN after
      const legacyRawSsh = useBeforeAll(async () => {
        const owner = 'ehmpath-legacy-rawssh';

        // the raw ssh pubkey is the recipient verbatim (mech 'ssh') — the exact shape
        // genKeyrackRecipientSealed's pre-feature raw-ssh branch produced
        const pubkey = getOneSshPubkey({ keyPath: scene.keyPath });

        const manifest = genMockKeyrackHostManifest({
          owner,
          recipients: [
            new KeyrackKeyRecipient({
              mech: 'ssh',
              pubkey,
              label: 'default',
              addedAt: new Date().toISOString(),
            }),
          ],
          hosts: { 'testorg.test.API_KEY': { vault: 'os.direct' } },
        });

        // persist it — daoKeyrackHostManifest.set seals to the manifest's own recipients,
        // so a mech-'ssh' recipient yields a raw ssh-ed25519 stanza via the age cli
        await daoKeyrackHostManifest.set({ upsert: manifest });

        return { owner, pubkey, manifest };
      });

      when('[t0] migration runs against the raw-ssh legacy manifest', () => {
        const result = useBeforeAll(async () => {
          const context = genContextKeyrack({
            owner: legacyRawSsh.owner,
            prikeys: [scene.keyPath],
            askpassCandidates: [scene.askpass],
          });
          const { result: outcome, errLines } = await withCapturedConsoleError(
            async () =>
              migrateKeyrackManifestToVariantA(
                {
                  owner: legacyRawSsh.owner,
                  manifest: legacyRawSsh.manifest,
                  prikey: scene.keyPath,
                  askpassCandidates: [scene.askpass],
                },
                context,
              ),
          );
          return { outcome, errLines };
        });

        then(
          'it reports migrated = true (the broadened raw-ssh gate fires)',
          () => {
            expect(result.outcome.migrated).toBe(true);
          },
        );

        then('the ⛵ upgrade banner is announced', () => {
          const bannerLine = result.errLines.find((line) =>
            line.includes('⛵'),
          );
          expect(bannerLine).toContain(
            '⛵ upgrade ehmpath-legacy-rawssh identity to the ssh-agent unlock',
          );
        });

        then(
          'the manifest is re-sealed to the derived K recipient (mech age, age1…)',
          async () => {
            const context = genContextKeyrack({
              owner: legacyRawSsh.owner,
              prikeys: [scene.keyPath],
              askpassCandidates: [scene.askpass],
            });
            const reloaded = await daoKeyrackHostManifest.get(
              { owner: legacyRawSsh.owner },
              context,
            );
            expect(reloaded?.manifest.recipients.length).toEqual(1);
            const recipient = reloaded!.manifest.recipients[0]!;
            expect(recipient.mech).toEqual('age');
            expect(recipient.pubkey.startsWith('age1')).toBe(true);
            // the raw ssh recipient is gone (hardcut to K)
            expect(recipient.pubkey).not.toEqual(legacyRawSsh.pubkey);
          },
        );
      });
    },
  );

  given(
    '[case5] a legacy manifest that ALSO carries a teammate/backup recipient',
    () => {
      // the r11 i057 clamp: the hardcut drops every non-K recipient. for the common
      // one-recipient legacy manifest that is silent + fine. but a manifest that grew
      // a SECOND recipient via `recipient set` (a teammate/backup key) would lose it
      // with NO signal. this seals a 2-recipient legacy manifest and asserts the
      // upgrade NAMES the dropped recipients (so the drop is visible, never silent),
      // while the hardcut-to-K still holds. RED before the notice was added (no such
      // stderr line), GREEN after
      const legacyMulti = useBeforeAll(async () => {
        const owner = 'ehmpath-legacy-multi';

        // recipient 1: the legacy ssh-pubkey age1 (the migrate trigger)
        const pubkey = getOneSshPubkey({ keyPath: scene.keyPath });
        const legacyRecipientPubkey = asAgeRecipientFromSshPubkey({ pubkey });

        // recipient 2: a distinct teammate/backup key added via `recipient set` —
        // the passphrase-less key's age1 recipient stands in for it
        const teammatePubkey = getOneSshPubkey({
          keyPath: scene.keyPathNoPass,
        });
        const teammateRecipientPubkey = asAgeRecipientFromSshPubkey({
          pubkey: teammatePubkey,
        });

        const manifest = genMockKeyrackHostManifest({
          owner,
          recipients: [
            new KeyrackKeyRecipient({
              mech: 'age',
              pubkey: legacyRecipientPubkey,
              label: 'default',
              addedAt: new Date().toISOString(),
            }),
            new KeyrackKeyRecipient({
              mech: 'age',
              pubkey: teammateRecipientPubkey,
              label: 'teammate-backup',
              addedAt: new Date().toISOString(),
            }),
          ],
          hosts: { 'testorg.test.API_KEY': { vault: 'os.direct' } },
        });
        await daoKeyrackHostManifest.set({ upsert: manifest });

        return { owner, teammateRecipientPubkey, manifest };
      });

      when(
        '[t0] migration runs against the 2-recipient legacy manifest',
        () => {
          const result = useBeforeAll(async () => {
            const context = genContextKeyrack({
              owner: legacyMulti.owner,
              prikeys: [scene.keyPath],
              askpassCandidates: [scene.askpass],
            });
            // capture the ⛵ stderr banner via the shared read-only HOF (see its .mock/.why/.real)
            const { result: outcome, errLines } =
              await withCapturedConsoleError(async () =>
                migrateKeyrackManifestToVariantA(
                  {
                    owner: legacyMulti.owner,
                    manifest: legacyMulti.manifest,
                    prikey: scene.keyPath,
                    askpassCandidates: [scene.askpass],
                  },
                  context,
                ),
              );
            return { outcome, errLines };
          });

          then('it reports migrated = true', () => {
            expect(result.outcome.migrated).toBe(true);
          });

          then(
            'the upgrade NAMES the dropped recipients — never a silent drop',
            () => {
              const noticeLine = result.errLines.find((line) =>
                line.includes('drops 2 prior recipient(s)'),
              );
              expect(noticeLine).toBeTruthy();
              // it names the teammate/backup recipient by its label, so the human knows
              // exactly what went away and can re-add it
              const noticeBlock = result.errLines.join('\n');
              expect(noticeBlock).toContain('teammate-backup');
              expect(noticeBlock).toContain('rhx keyrack recipient set');
              // the recipient pubkeys derive from per-run throwaway ssh keys, so they
              // vary every run — swap the age1 tokens for a stable placeholder so the
              // snapshot pins the notice SHAPE (⛵/⚠️ text, tree, labels, fix line)
              // deterministically, not the random bytes (rule.require.hermetic-tests)
              const noticeBlockStable = noticeBlock.replace(
                /age1[0-9a-z]+/g,
                'age1<REDACTED>',
              );
              expect(noticeBlockStable).toMatchSnapshot(
                'migrate-dropped-recipients',
              );
            },
          );

          then(
            'the hardcut still holds — reloaded manifest is sealed to K ONLY',
            async () => {
              const context = genContextKeyrack({
                owner: legacyMulti.owner,
                prikeys: [scene.keyPath],
                askpassCandidates: [scene.askpass],
              });
              const reloaded = await daoKeyrackHostManifest.get(
                { owner: legacyMulti.owner },
                context,
              );
              expect(reloaded?.manifest.recipients.length).toEqual(1);
              const recipient = reloaded!.manifest.recipients[0]!;
              expect(recipient.pubkey.startsWith('age1')).toBe(true);
              // neither prior recipient survives (the teammate one is truly dropped)
              expect(recipient.pubkey).not.toEqual(
                legacyMulti.teammateRecipientPubkey,
              );
            },
          );
        },
      );
    },
  );

  given('[case2] a manifest whose key is a passphrase-LESS ed25519 key', () => {
    const control = useBeforeAll(async () => {
      const owner = 'ehmpath-nopass';
      const pubkey = getOneSshPubkey({ keyPath: scene.keyPathNoPass });
      const manifest = genMockKeyrackHostManifest({
        owner,
        recipients: [
          new KeyrackKeyRecipient({
            mech: 'age',
            pubkey: asAgeRecipientFromSshPubkey({ pubkey }),
            label: 'default',
            addedAt: new Date().toISOString(),
          }),
        ],
      });
      await daoKeyrackHostManifest.set({ upsert: manifest });
      return { owner, manifest };
    });

    when('[t0] migration runs', () => {
      const result = useBeforeAll(async () => {
        const context = genContextKeyrack({
          owner: control.owner,
          prikeys: [scene.keyPathNoPass],
        });
        return migrateKeyrackManifestToVariantA(
          {
            owner: control.owner,
            manifest: control.manifest,
            prikey: scene.keyPathNoPass,
          },
          context,
        );
      });

      then('it is a no-op (migrated = false) — no prompt, no re-seal', () => {
        expect(result.migrated).toBe(false);
      });
    });
  });

  given('[case3] the ssh key file is absent on this host', () => {
    when('[t0] migration runs with a --prikey that does not exist', () => {
      const result = useBeforeAll(async () => {
        const owner = 'ehmpath-absent-key';
        const context = genContextKeyrack({ owner });
        return migrateKeyrackManifestToVariantA(
          {
            owner,
            manifest: genMockKeyrackHostManifest({ owner }),
            prikey: join(scene.home, 'id_does_not_exist'),
          },
          context,
        );
      });

      then('it is a no-op (migrated = false) — never throws', () => {
        expect(result.migrated).toBe(false);
      });
    });
  });

  given('[case4] no --prikey given and no default ssh key on this host', () => {
    // the temp HOME holds keys at $HOME/id_* (NOT $HOME/.ssh/id_ed25519), so
    // getOneDefaultSshKey resolves to null here — the exact regression guard: unlock
    // must NOT break just because migration cannot find a key to re-seal with
    when('[t0] migration runs with no resolvable ssh key', () => {
      const result = useBeforeAll(async () => {
        const owner = 'ehmpath-nodefault';
        const context = genContextKeyrack({ owner });
        return migrateKeyrackManifestToVariantA(
          {
            owner,
            manifest: genMockKeyrackHostManifest({ owner }),
          },
          context,
        );
      });

      then('it is a no-op (migrated = false) — never throws', () => {
        expect(result.migrated).toBe(false);
      });
    });
  });
});
