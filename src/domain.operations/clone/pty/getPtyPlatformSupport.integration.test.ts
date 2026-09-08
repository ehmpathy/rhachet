import { given, then, when } from 'test-fns';

import { asPtyAddonFileName } from '@src/.test/assets/asPtyAddonFileName';

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { asPtyHostTuple } from './asPtyHostTuple';
import { getPtyModuleOrNull } from './getPtyModuleOrNull';
import { getPtyPlatformSupport } from './getPtyPlatformSupport';
import { getPtyPlatformSupportFromProcess } from './getPtyPlatformSupportFromProcess';

/**
 * .what = clamps our declared prebuild-support list against the node-pty tarball we
 *   actually depend on, read off disk
 *
 * .why  = `getPtyPlatformSupport` carries a hardcoded tuple list, and that list decides
 *   the ERROR CLASS a human is told:
 *   - we claim supported, upstream dropped it → MalfunctionError, "reinstall rhachet"
 *   - we claim unsupported, upstream added it → ConstraintError, "pass --no-socket"
 *   a version bump that widens or narrows upstream's set desyncs the list, with no test
 *   red anywhere.
 *
 * .note = the assertion is BIDIRECTIONAL over a fixed candidate matrix, so it catches a
 *   platform upstream ADDED as well as one it DROPPED. a one-way check (every dir on disk
 *   is supported) would stay green on a platform upstream had already removed.
 */

/**
 * .what = node-pty's in-package prebuild dir, found through node's own module lookup
 * .why  = points at the copy actually installed. the manifest is the one entry the
 *   package guarantees that lookup can reach
 */
const getPtyPrebuildsDir = (): string =>
  join(dirname(require.resolve('node-pty/package.json')), 'prebuilds');

/**
 * .what = the platform-arch pairs worth an assertion
 * .why  = the union of what upstream ships today and the near-misses that decide the
 *   class — freebsd and ia32 are the rows a human is most likely to hit off the matrix
 */
const CANDIDATE_TUPLES = [
  { platform: 'darwin', arch: 'arm64' },
  { platform: 'darwin', arch: 'x64' },
  { platform: 'darwin', arch: 'ia32' },
  { platform: 'linux', arch: 'arm64' },
  { platform: 'linux', arch: 'x64' },
  { platform: 'linux', arch: 'riscv64' },
  { platform: 'win32', arch: 'arm64' },
  { platform: 'win32', arch: 'x64' },
  { platform: 'win32', arch: 'ia32' },
  { platform: 'freebsd', arch: 'x64' },
] as const;

describe('getPtyPlatformSupport.integration', () => {
  given('[case1] the node-pty tarball this repo actually depends on', () => {
    const prebuildsDir = getPtyPrebuildsDir();

    when(
      '[t0] our declared support is compared against what ships on disk',
      () => {
        then(
          'the tarball is present at all — else no verdict below carries meaning',
          () => {
            // with this dir absent, every row below reads "unsupported" and the table
            // agrees with itself
            expect(existsSync(prebuildsDir)).toBe(true);
          },
        );

        then('every candidate row agrees with the addon on disk', () => {
          // libc: 'glibc' isolates the tuple decision from the libc decision — the libc
          // rows are owned by the pure unit test, which can reach them on any machine
          CANDIDATE_TUPLES.forEach((tuple) => {
            // 🚨 the on-disk side routes through `asPtyHostTuple` — the single owner of
            //   node-pty's `platform-arch` format. a hand-built join would desync the two
            //   halves of the clamp SILENTLY, both agreed on "unsupported"
            const shipped = existsSync(
              join(
                prebuildsDir,
                asPtyHostTuple({ platform: tuple.platform, arch: tuple.arch }),
                asPtyAddonFileName(tuple.platform),
              ),
            );
            const declared = getPtyPlatformSupport({
              platform: tuple.platform,
              arch: tuple.arch,
              libc: 'glibc',
            });
            expect({ ...tuple, support: declared }).toEqual({
              ...tuple,
              support: shipped ? 'supported' : 'unsupported',
            });
          });
        });
      },
    );
  });

  given(
    '[case2] the ambient wrapper, applied to the machine this suite runs on',
    () => {
      // .why = `getPtyPlatformSupportFromProcess` is the ONLY caller genCloneOndisk uses,
      //   and its libc read probes an untyped node report. a silent `musl` read on a glibc
      //   host reclassifies linux as UNSUPPORTED. no pure test reaches that: the pure
      //   function is FED the libc answer rather than reads it
      when(
        '[t0] its verdict is cross-checked against a REAL addon load',
        () => {
          const ptyModule = getPtyModuleOrNull();

          then('the addon this case cross-checks against is LOADABLE', () => {
            // 🚨 every row below is a material implication keyed on `ptyModule !== null`,
            //   so an absent addon short-circuits all three to a vacuous pass. this row
            //   turns that vacuity RED (`rule.forbid.failhide`)
            //
            // ⚠️ on an unsupported host (musl, freebsd, riscv) there is genuinely no
            //   addon, so this row reddens there — LOUD rather than skipped, per
            //   `philosophy.verification-strictness`
            expect({
              support: getPtyPlatformSupportFromProcess(),
              loadable: ptyModule !== null,
            }).toEqual({
              support: getPtyPlatformSupportFromProcess(),
              loadable: true,
            });
          });

          then(
            'a loadable addon implies we declare this platform supported',
            () => {
              // a load proves a prebuild is present and dlopen-able here, so any verdict
              // but `supported` names a broken tuple list or a broken libc probe
              //
              // .note = a MATERIAL IMPLICATION `loaded → supported`, vacuous where
              //   `ptyModule === null`. the precondition row above reddens there
              //
              // .note = the CONVERSE is deliberately not asserted. a supported platform
              //   with no addon is the MalfunctionError row (a damaged install), so a
              //   demand for a load here would redden on the condition the error reports
              expect(
                ptyModule !== null &&
                  getPtyPlatformSupportFromProcess() !== 'supported',
              ).toBe(false);
            },
          );

          then(
            'it never claims MORE support than the tuple list alone allows',
            () => {
              // `libc: 'glibc'` is the most permissive libc answer, so it upper-bounds any
              // host verdict. pins the COMPOSITION (that the wrapper routes through the
              // shared pure function) rather than the verdict, so it holds on every platform
              //
              // .note = an implication, never an equality — an equality would demand a
              //   glibc read and redden on a musl host. the libc rows belong to the pure
              //   unit test
              const upperBound = getPtyPlatformSupport({
                platform: process.platform,
                arch: process.arch,
                libc: 'glibc',
              });
              expect(
                getPtyPlatformSupportFromProcess() === 'supported' &&
                  upperBound !== 'supported',
              ).toBe(false);
            },
          );

          then(
            'a loadable addon also proves the libc probe did not silently fail',
            () => {
              // .why = an unreadable report yields `unknown`, which on linux the FIELD
              //   alone cannot tell from musl. a clean dlopen is independent evidence the
              //   host runs the glibc-linked binary, so `unknown` beside a live addon
              //   means the probe read naught
              //
              // .note = names WHICH failure it is, so a drift in the witness field reports
              //   as a probe defect rather than a vague tuple-list mismatch
              expect(
                ptyModule !== null &&
                  getPtyPlatformSupportFromProcess() === 'unknown',
              ).toBe(false);
            },
          );
        },
      );
    },
  );
});
