import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { getProbeHoldMs, getProbeSlug } from './getProbeSlug';

describe('getProbeSlug', () => {
  given('[case1] the clamp handed no slug', () => {
    when('[t0] a probe asks for it', () => {
      then('it refuses as a ConstraintError that names the env var and the fix', async () => {
        const slugOriginal = process.env.TEMPDIR_CLAMP_SLUG;
        delete process.env.TEMPDIR_CLAMP_SLUG;
        try {
          const error = await getError(() => getProbeSlug());
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toMatchSnapshot();
        } finally {
          if (slugOriginal !== undefined)
            process.env.TEMPDIR_CLAMP_SLUG = slugOriginal;
        }
      });
    });
  });

  given('[case2] the clamp handed a slug', () => {
    when('[t0] a probe asks for it', () => {
      then('it yields the slug', () => {
        const slugOriginal = process.env.TEMPDIR_CLAMP_SLUG;
        process.env.TEMPDIR_CLAMP_SLUG = 'tempdir-clamp-x-1234';
        try {
          expect(getProbeSlug()).toEqual('tempdir-clamp-x-1234');
        } finally {
          if (slugOriginal === undefined) delete process.env.TEMPDIR_CLAMP_SLUG;
          else process.env.TEMPDIR_CLAMP_SLUG = slugOriginal;
        }
      });
    });
  });
});

describe('getProbeHoldMs', () => {
  given('[case1] no hold was handed', () => {
    when('[t0] a probe asks for it', () => {
      then('it holds for naught', () => {
        const holdOriginal = process.env.TEMPDIR_CLAMP_HOLD_MS;
        delete process.env.TEMPDIR_CLAMP_HOLD_MS;
        try {
          expect(getProbeHoldMs()).toEqual(0);
        } finally {
          if (holdOriginal !== undefined)
            process.env.TEMPDIR_CLAMP_HOLD_MS = holdOriginal;
        }
      });
    });
  });

  given('[case3] an empty hold was handed', () => {
    when('[t0] a probe asks for it', () => {
      then('it refuses, rather than degrade silently to no hold', async () => {
        const holdOriginal = process.env.TEMPDIR_CLAMP_HOLD_MS;
        process.env.TEMPDIR_CLAMP_HOLD_MS = '';
        try {
          const error = await getError(() => getProbeHoldMs());
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('TEMPDIR_CLAMP_HOLD_MS');
        } finally {
          if (holdOriginal === undefined) delete process.env.TEMPDIR_CLAMP_HOLD_MS;
          if (holdOriginal !== undefined) process.env.TEMPDIR_CLAMP_HOLD_MS = holdOriginal;
        }
      });
    });
  });

  given('[case2] a malformed hold was handed', () => {
    when('[t0] a probe asks for it', () => {
      then('it refuses as a ConstraintError that names the env var and the fix', async () => {
        const holdOriginal = process.env.TEMPDIR_CLAMP_HOLD_MS;
        process.env.TEMPDIR_CLAMP_HOLD_MS = '60s';
        try {
          const error = await getError(() => getProbeHoldMs());
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toMatchSnapshot();
        } finally {
          if (holdOriginal === undefined) delete process.env.TEMPDIR_CLAMP_HOLD_MS;
          if (holdOriginal !== undefined) process.env.TEMPDIR_CLAMP_HOLD_MS = holdOriginal;
        }
      });
    });
  });
});
