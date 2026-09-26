import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleEphemeralSshKey } from '@src/.test/assets/genSampleEphemeralSshKey';

import { assertGraphicalDialogAvailable } from './assertGraphicalDialogAvailable';

/**
 * .what = prove the ONE shared headless guard both unlock paths call: it fires only
 *         when a passphrased key would need the dialog with no display and no supplied
 *         dialog, and its message names the correct `--owner` retry flag
 * .why  = the ed25519 and rsa/ecdsa paths each hand-inlined this guard and DRIFTED —
 *         the rsa copy hardcoded owner=null, so its headless message could never
 *         surface `--owner`. this clamps the unified guard: owner threads into the
 *         message, and the three short-circuits (dialog supplied / display present /
 *         passphrase-less key) each hold (r11 i046 blocker 2)
 *
 * .note = integration (real ssh-keygen keys + the real env probe). DISPLAY and
 *         WAYLAND_DISPLAY are saved and restored so the probe reads a controlled
 *         headless/graphical state and no state crosses into other suites
 */
describe('assertGraphicalDialogAvailable', () => {
  const scene = useBeforeAll(async () => {
    const passphrased = genSampleEphemeralSshKey({
      passphrase: 'x',
      keyName: 'id_pass',
    });
    const passless = genSampleEphemeralSshKey({
      dir: passphrased.dir,
      keyName: 'id_free',
    });
    return {
      passphrasedKeyPath: passphrased.keyPath,
      passlessKeyPath: passless.keyPath,
    };
  });

  const savedDisplay = process.env.DISPLAY;
  const savedWayland = process.env.WAYLAND_DISPLAY;
  const forceHeadless = (): void => {
    delete process.env.DISPLAY;
    delete process.env.WAYLAND_DISPLAY;
  };
  const forceGraphical = (): void => {
    process.env.DISPLAY = ':0';
    delete process.env.WAYLAND_DISPLAY;
  };
  afterEach(() => {
    if (savedDisplay === undefined) delete process.env.DISPLAY;
    else process.env.DISPLAY = savedDisplay;
    if (savedWayland === undefined) delete process.env.WAYLAND_DISPLAY;
    else process.env.WAYLAND_DISPLAY = savedWayland;
  });

  given('[case1] headless + passphrased key + no supplied dialog', () => {
    when('[t0] the guard runs with an owner', () => {
      then(
        'it throws a headless error that names the --owner retry flag',
        () => {
          forceHeadless();
          const error = getError(() =>
            assertGraphicalDialogAvailable({
              owner: 'ehmpath',
              keyPath: scene.passphrasedKeyPath,
              dialogSupplied: false,
            }),
          );
          expect(error).not.toBeNull();
          expect(error.message).toContain('no display');
          expect(error.message).toContain('--owner ehmpath');
        },
      );
    });

    when('[t1] the guard runs with a null owner', () => {
      then('it still throws, and the message omits the --owner flag', () => {
        forceHeadless();
        const error = getError(() =>
          assertGraphicalDialogAvailable({
            owner: null,
            keyPath: scene.passphrasedKeyPath,
            dialogSupplied: false,
          }),
        );
        expect(error).not.toBeNull();
        expect(error.message).not.toContain('--owner');
      });
    });
  });

  given('[case2] the three short-circuits do not throw', () => {
    when('[t0] a dialog is supplied (headless, passphrased)', () => {
      then('it does not throw', () => {
        forceHeadless();
        expect(() =>
          assertGraphicalDialogAvailable({
            owner: 'ehmpath',
            keyPath: scene.passphrasedKeyPath,
            dialogSupplied: true,
          }),
        ).not.toThrow();
      });
    });

    when('[t1] a display is present (passphrased, no dialog)', () => {
      then('it does not throw', () => {
        forceGraphical();
        expect(() =>
          assertGraphicalDialogAvailable({
            owner: 'ehmpath',
            keyPath: scene.passphrasedKeyPath,
            dialogSupplied: false,
          }),
        ).not.toThrow();
      });
    });

    when('[t2] the key is passphrase-less (headless, no dialog)', () => {
      then('it does not throw', () => {
        forceHeadless();
        expect(() =>
          assertGraphicalDialogAvailable({
            owner: 'ehmpath',
            keyPath: scene.passlessKeyPath,
            dialogSupplied: false,
          }),
        ).not.toThrow();
      });
    });
  });
});
