import { ConstraintError, getError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getOneAskpassDialog } from './getOneAskpassDialog';

/**
 * .what = prove dialog detection returns a real candidate when present, and
 *         fails fast with the install fix when absent
 * .why  = keyrack must NEVER silently drop to the tty; absent → a caller-fix
 *         ConstraintError with the exact `apt install` (vision q2)
 *
 * .note = integration (touches the real filesystem via injected candidate
 *         paths); self-isolated — own temp files, never the host's real dialog
 */
describe('getOneAskpassDialog', () => {
  const scene = useBeforeAll(async () => {
    // a temp file as a stand-in for an installed dialog binary
    const dir = mkdtempSync(join(tmpdir(), 'kr-askpass-'));
    const present = join(dir, 'gnome-ssh-askpass');
    execFileSync('touch', [present], { stdio: 'pipe', timeout: 30_000 });
    const absent = join(dir, 'does-not-exist');
    return { present, absent };
  });

  given('[case1] a candidate that exists', () => {
    when('[t0] detection runs', () => {
      then('it returns the found dialog path', () => {
        const dialog = getOneAskpassDialog({
          candidates: [scene.absent, scene.present],
        });
        expect(dialog).toEqual(scene.present);
      });
    });
  });

  given('[case3] KEYRACK_ASKPASS override names an extant dialog', () => {
    when('[t0] detection runs with NO explicit candidates', () => {
      then('it returns the override path (the CLI-reachable seam)', () => {
        // this is the seam a blackbox CLI test (and a real operator) reaches,
        // since the `candidates` injection never crosses the CLI boundary
        const prior = process.env.KEYRACK_ASKPASS;
        process.env.KEYRACK_ASKPASS = scene.present;
        try {
          const dialog = getOneAskpassDialog();
          expect(dialog).toEqual(scene.present);
        } finally {
          if (prior === undefined) delete process.env.KEYRACK_ASKPASS;
          else process.env.KEYRACK_ASKPASS = prior;
        }
      });
    });
  });

  given('[case5] KEYRACK_ASKPASS override names an ABSENT dialog', () => {
    when('[t0] detection runs with NO explicit candidates', () => {
      then('it fails fast at the override, NOT a host dialog', async () => {
        // the override is authoritative: a set-but-absent override must fail
        // fast on ANY host (never fall through to whatever dialog the host has
        // on disk) — this is what makes absence hermetically forceable for a
        // blackbox test, and the reason the check is host-independent here
        const prior = process.env.KEYRACK_ASKPASS;
        process.env.KEYRACK_ASKPASS = '/nonexistent/operator-chose-this';
        try {
          const error = await getError(async () => getOneAskpassDialog());
          expect(error).toBeInstanceOf(ConstraintError);
          // names the exact path the operator set + points back at the override
          expect(error.message).toContain('/nonexistent/operator-chose-this');
          expect(error.message).toContain('KEYRACK_ASKPASS');
          // NOT the generic "install ssh-askpass-gnome" — this is a miswire, not
          // an absent package (the two name two different fixes)
          expect(error.message).not.toContain('sudo apt install');
          expect(error.message).toMatchSnapshot();
        } finally {
          if (prior === undefined) delete process.env.KEYRACK_ASKPASS;
          else process.env.KEYRACK_ASKPASS = prior;
        }
      });
    });
  });

  given('[case6] an empty candidates array (not injected)', () => {
    when('[t0] detection runs with KEYRACK_ASKPASS set', () => {
      then('it honors the override — `[]` means "not injected"', () => {
        // the footgun clamp: `withKeyrackWrapKeyViaAgent` passes `[]` to mean
        // "no dialog injected", so `[]` must fall through to the override (and
        // to host discovery), NOT be read as a present injection that skips both
        const prior = process.env.KEYRACK_ASKPASS;
        process.env.KEYRACK_ASKPASS = scene.present;
        try {
          const dialog = getOneAskpassDialog({ candidates: [] });
          expect(dialog).toEqual(scene.present);
        } finally {
          if (prior === undefined) delete process.env.KEYRACK_ASKPASS;
          else process.env.KEYRACK_ASKPASS = prior;
        }
      });
    });
  });

  given('[case2] no candidate exists, on Linux', () => {
    when('[t0] detection runs', () => {
      then('it throws a ConstraintError with the apt fix', async () => {
        const error = await getError(async () =>
          // a FIXED nonexistent path + pinned platform so the snap stays
          // deterministic no matter which os runs the test
          getOneAskpassDialog({
            candidates: ['/nonexistent/gnome-ssh-askpass'],
            platform: 'linux',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        // names the package + all three common package managers, so a
        // non-Debian human is not misdirected to an apt-only fix
        expect(error.message).toContain('sudo apt install ssh-askpass-gnome');
        expect(error.message).toContain('sudo dnf install ssh-askpass-gnome');
        expect(error.message).toContain('sudo pacman -S ssh-askpass-gnome');
        expect(error.message).toContain('keylogger');
        // snap the full user-faced message so its exact text cannot drift
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case4] no candidate exists, off Linux (macOS)', () => {
    when('[t0] detection runs on darwin', () => {
      then(
        'it fails fast with a platform-aware fix, NOT the apt command',
        async () => {
          const error = await getError(async () =>
            getOneAskpassDialog({
              candidates: ['/nonexistent/gnome-ssh-askpass'],
              platform: 'darwin',
            }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          // names the platform a macOS human recognizes, not a node id
          expect(error.message).toContain('macOS');
          // an `apt` command is a dead end off Debian/Linux — it must NOT appear
          expect(error.message).not.toContain('apt install');
          // points at the seam a non-Linux human can actually use
          expect(error.message).toContain('KEYRACK_ASKPASS');
          // still names the keylogger why (the mandate holds cross-platform)
          expect(error.message).toContain('keylogger');
          // snap the full off-Linux message so its exact text cannot drift
          expect(error.message).toMatchSnapshot();
        },
      );
    });
  });
});
