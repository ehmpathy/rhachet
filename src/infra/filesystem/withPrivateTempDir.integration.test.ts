import { getError, given, then, when } from 'test-fns';

import { existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withPrivateTempDir } from './withPrivateTempDir';

describe('withPrivateTempDir', () => {
  given('[case1] an operation that succeeds', () => {
    when('[t0] run inside a private temp dir', () => {
      const captured = withPrivateTempDir({ prefix: 'kr-wptd-ok-' }, (dir) => {
        writeFileSync(join(dir, 'f.txt'), 'hi', 'utf8');
        return { dir, mode: statSync(dir).mode & 0o777 };
      });

      then('the dir was created 0700 (owner-only)', () => {
        expect(captured.mode).toEqual(0o700);
      });

      then('the dir is removed after the operation returns', () => {
        expect(existsSync(captured.dir)).toBe(false);
      });
    });
  });

  given('[case2] an operation that throws', () => {
    when('[t0] the body throws', () => {
      let leakedDir: string | null = null;
      // pin the generic to <void>: a body that always throws infers `never`, which
      // would mislead getError's overload into the async branch
      const error = getError(() =>
        withPrivateTempDir<void>({ prefix: 'kr-wptd-throw-' }, (dir) => {
          leakedDir = dir;
          throw new Error('boom');
        }),
      );

      then('the original error surfaces (not masked by cleanup)', () => {
        expect(error.message).toContain('boom');
      });

      then('the dir is still removed despite the throw', () => {
        expect(leakedDir).not.toEqual(null);
        expect(existsSync(leakedDir as unknown as string)).toBe(false);
      });
    });
  });

  given('[case3] the return value passes through', () => {
    when('[t0] the body returns a value', () => {
      const result = withPrivateTempDir({ prefix: 'kr-wptd-ret-' }, () => 42);

      then('the caller receives it unchanged', () => {
        expect(result).toEqual(42);
      });
    });
  });

  given('[case4] the signal-safety net (decrypted-key protection)', () => {
    // the r11 i057 clamp: a consumer (asDecryptedSshKeyCopy) leaves a DECRYPTED
    // plaintext key in this dir while it blocks ~120s on the gnome dialog. a Ctrl+C
    // in that window must reap the dir, not strand the key. that needs a SIGINT/
    // SIGTERM/SIGHUP reaper registered for the dir's lifetime — the exact net
    // genEphemeralSshAgent installs. this clamp proves the net is present in the body
    // and gone after, so it goes RED under the prior finally-only code (zero handlers
    // added) and GREEN once the reaper is wired
    when('[t0] an operation runs inside the dir', () => {
      const baseline = {
        sigint: process.listeners('SIGINT').length,
        sigterm: process.listeners('SIGTERM').length,
        sighup: process.listeners('SIGHUP').length,
      };

      // capture the live handler counts FROM INSIDE the body — the window in which a
      // real decrypted key would sit on disk while the human answers the dialog
      const inBody = withPrivateTempDir({ prefix: 'kr-wptd-sig-' }, () => ({
        sigint: process.listeners('SIGINT').length,
        sigterm: process.listeners('SIGTERM').length,
        sighup: process.listeners('SIGHUP').length,
      }));

      then(
        'a reaper is registered for each abrupt-stop signal in the body',
        () => {
          expect(inBody.sigint).toEqual(baseline.sigint + 1);
          expect(inBody.sigterm).toEqual(baseline.sigterm + 1);
          expect(inBody.sighup).toEqual(baseline.sighup + 1);
        },
      );

      then('every reaper is de-registered after the operation returns', () => {
        // no listener leak across calls — the net lives only for the dir's lifetime
        expect(process.listeners('SIGINT').length).toEqual(baseline.sigint);
        expect(process.listeners('SIGTERM').length).toEqual(baseline.sigterm);
        expect(process.listeners('SIGHUP').length).toEqual(baseline.sighup);
      });
    });
  });
});
