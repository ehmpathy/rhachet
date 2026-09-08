import { given, then, when } from 'test-fns';

import { getPtyPlatformSupport } from './getPtyPlatformSupport';

/**
 * .what = pin which hosts upstream ships a prebuilt pty addon for
 * .why  = this decision picks the error class an absent addon reports, so a wrong row
 *   tells a human "you can fix this" when the truth is "we must" — or the reverse
 */
describe('getPtyPlatformSupport', () => {
  given(
    '[case1] a linux host — the only platform the tuple cannot decide alone',
    () => {
      when('[t0] it runs glibc', () => {
        then('both linux tuples are supported', () => {
          // upstream builds these against a glibc-2.28 sysroot, so they load on any
          // glibc host at or above that floor
          expect(
            getPtyPlatformSupport({
              platform: 'linux',
              arch: 'x64',
              libc: 'glibc',
            }),
          ).toBe('supported');
          expect(
            getPtyPlatformSupport({
              platform: 'linux',
              arch: 'arm64',
              libc: 'glibc',
            }),
          ).toBe('supported');
        });
      });

      when('[t1] it runs musl (alpine)', () => {
        then(
          'it is UNSUPPORTED even though the tuple matches — the tuple alone cannot decide linux',
          () => {
            // the `os` gate says linux, so the glibc binary may well install; it then
            // fails at dlopen. reported as a malfunction, that would accuse our own
            // artifact of a break upstream never shipped a fix for
            expect(
              getPtyPlatformSupport({
                platform: 'linux',
                arch: 'x64',
                libc: 'musl',
              }),
            ).toBe('unsupported');
            expect(
              getPtyPlatformSupport({
                platform: 'linux',
                arch: 'arm64',
                libc: 'musl',
              }),
            ).toBe('unsupported');
          },
        );
      });

      when('[t2] its libc could not be read', () => {
        then(
          'the verdict is UNKNOWN — never silently one of the two rows above',
          () => {
            // the whole point of the tri-state. to answer `unsupported` here would tell a
            // glibc human "pass --no-socket" about an install WE broke — an opt-out they
            // never revisit. to answer `supported` would tell a musl human "reinstall",
            // a cure that runs clean and repairs naught. both are the defect class this
            // change exists to retire, so the honest answer is that we do not know
            expect(
              getPtyPlatformSupport({
                platform: 'linux',
                arch: 'x64',
                libc: 'unreadable',
              }),
            ).toBe('unknown');
            expect(
              getPtyPlatformSupport({
                platform: 'linux',
                arch: 'arm64',
                libc: 'unreadable',
              }),
            ).toBe('unknown');
          },
        );
      });
    },
  );

  given('[case2] a platform upstream ships a prebuild for', () => {
    when('[t0] the tuple is checked', () => {
      then('darwin and win32 tuples are supported', () => {
        expect(
          getPtyPlatformSupport({
            platform: 'darwin',
            arch: 'arm64',
            libc: 'musl',
          }),
        ).toBe('supported');
        expect(
          getPtyPlatformSupport({
            platform: 'darwin',
            arch: 'x64',
            libc: 'musl',
          }),
        ).toBe('supported');
        expect(
          getPtyPlatformSupport({
            platform: 'win32',
            arch: 'arm64',
            libc: 'musl',
          }),
        ).toBe('supported');
        expect(
          getPtyPlatformSupport({
            platform: 'win32',
            arch: 'x64',
            libc: 'musl',
          }),
        ).toBe('supported');
      });

      then('libc does not decide a non-linux row', () => {
        // only linux prebuilds are glibc-linked, so the word must not leak into the
        // darwin/win32 verdicts — asserted so a later edit cannot make it leak silently
        expect(
          getPtyPlatformSupport({
            platform: 'darwin',
            arch: 'arm64',
            libc: 'glibc',
          }),
        ).toBe('supported');
        expect(
          getPtyPlatformSupport({
            platform: 'win32',
            arch: 'x64',
            libc: 'glibc',
          }),
        ).toBe('supported');
      });

      then('an UNREADABLE libc does not cloud a non-linux row either', () => {
        // the asymmetry stated as an assertion: libc governs linux and governs naught
        // elsewhere, so an unreadable probe may only cloud the row it actually decides.
        // were `unknown` to short-circuit ahead of the platform check, a mac with a
        // drifted report would report the diagnostic hint — which names `ldd`, a command
        // that is not even the right question there
        expect(
          getPtyPlatformSupport({
            platform: 'darwin',
            arch: 'arm64',
            libc: 'unreadable',
          }),
        ).toBe('supported');
        expect(
          getPtyPlatformSupport({
            platform: 'win32',
            arch: 'x64',
            libc: 'unreadable',
          }),
        ).toBe('supported');
      });
    });
  });

  given('[case3] a platform upstream ships NO prebuild for', () => {
    when('[t0] the tuple is checked', () => {
      then(
        'it is unsupported, so an absent addon becomes an opt-out for the caller',
        () => {
          expect(
            getPtyPlatformSupport({
              platform: 'freebsd',
              arch: 'x64',
              libc: 'glibc',
            }),
          ).toBe('unsupported');
          expect(
            getPtyPlatformSupport({
              platform: 'linux',
              arch: 'riscv64',
              libc: 'glibc',
            }),
          ).toBe('unsupported');
          expect(
            getPtyPlatformSupport({
              platform: 'darwin',
              arch: 'ia32',
              libc: 'musl',
            }),
          ).toBe('unsupported');
        },
      );
    });

    when('[t1] its libc could not be read either', () => {
      then(
        'the verdict stays a DEFINITE unsupported — no libc can rescue an absent tuple',
        () => {
          // `linux-riscv64` is the row that matters: it is linux, so a check that asked
          // about libc before the tuple would answer `unknown` and send the human to run
          // `ldd`. but no libc answer changes this verdict — upstream ships no riscv
          // binary for either — so an unreadable probe must not manufacture a doubt
          expect(
            getPtyPlatformSupport({
              platform: 'linux',
              arch: 'riscv64',
              libc: 'unreadable',
            }),
          ).toBe('unsupported');
          expect(
            getPtyPlatformSupport({
              platform: 'freebsd',
              arch: 'x64',
              libc: 'unreadable',
            }),
          ).toBe('unsupported');
        },
      );
    });
  });
});
