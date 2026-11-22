import { MalfunctionError } from 'helpful-errors';

import { existsSync } from 'node:fs';

import { genTempDirPhysical } from '../../infra/genTempDirPhysical';
import { getProbeHoldMs, getProbeSlug } from './getProbeSlug';

/**
 * .what = a probe for the autoprune clamp; never part of a normal suite
 * .why = it allocates temp dirs under the slug the clamp hands it, so the clamp
 *        can count what this run left behind (genTempDirPhysical.integration.test.ts)
 */
const holdMs = getProbeHoldMs();

test(
  'beta allocates two temp dirs',
  async () => {
    const slug = getProbeSlug();
    const dirs = [genTempDirPhysical({ slug }), genTempDirPhysical({ slug })];
    expect(dirs.every((dir) => existsSync(dir))).toBe(true);
    if (holdMs > 0) await new Promise((done) => setTimeout(done, holdMs));
    if (process.env.TEMPDIR_CLAMP_FAIL === 'beta')
      throw new MalfunctionError(
        'tempdir-clamp: a deliberate failure, after allocation',
        { probe: 'beta', slug, dirs, hint: 'an injected fault, set by TEMPDIR_CLAMP_FAIL; unset it to run the clamp green' },
      );
  },
  // the test timeout must exceed the hold: a timeout below it would kill the probe before
  // the hold elapses, and the clamp would measure the harness, not the reclaim
  holdMs + 10_000,
);
