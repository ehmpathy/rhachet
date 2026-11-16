import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getBrainAuthPath } from '@src/domain.operations/brain/auth/getBrainAuthPath';

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { setClaudeGroveOauthSwapped } from './setClaudeGroveOauthSwapped';

/**
 * .what = the grove compare-and-swap, over a real login file and claude's real write lock
 * .note = the tokens are plain labels, never a key shape
 */
const genGrove = (input: { slug: string; refreshToken: string }) => {
  const home = genTempDir({ slug: input.slug });
  const brainAuthPath = getBrainAuthPath({ home });
  mkdirSync(dirname(brainAuthPath), { recursive: true });
  writeFileSync(
    brainAuthPath,
    JSON.stringify({
      claudeAiOauth: {
        accessToken: 'access.a.1',
        refreshToken: input.refreshToken,
        expiresAt: 1,
        scopes: ['user:inference'],
        subscriptionType: 'max',
      },
      mcpOAuth: { kept: true },
    }),
  );
  return { brainAuthPath };
};

const oauthB = {
  accessToken: 'access.b.1',
  refreshToken: 'refresh.b.1',
  expiresAt: 2,
  scopes: ['user:inference', 'user:profile'],
  subscriptionType: null,
};

describe('setClaudeGroveOauthSwapped', () => {
  given('[case1] the grove still holds the token the caller read', () => {
    when('[t0] the swap runs', () => {
      const scene = useBeforeAll(async () => {
        const grove = genGrove({
          slug: 'grove-swap-match',
          refreshToken: 'refresh.a.1',
        });
        const isSwapped = await setClaudeGroveOauthSwapped({
          brainAuthPath: grove.brainAuthPath,
          refreshTokenBefore: 'refresh.a.1',
          oauth: oauthB,
        });
        return {
          isSwapped,
          file: JSON.parse(readFileSync(grove.brainAuthPath, 'utf8')),
        };
      });

      then('it reports the swap', () => {
        expect(scene.isSwapped).toEqual(true);
      });

      then('the file holds the new login, and its other keys as found', () => {
        expect(scene.file.claudeAiOauth.refreshToken).toEqual('refresh.b.1');
        expect(scene.file.mcpOAuth).toEqual({ kept: true });
      });
    });
  });

  given(
    '[case2] a live session rotated the grove since the caller read it',
    () => {
      when('[t0] the swap runs', () => {
        const scene = useBeforeAll(async () => {
          const grove = genGrove({
            slug: 'grove-swap-rotated',
            refreshToken: 'refresh.a.2',
          });
          const before = readFileSync(grove.brainAuthPath, 'utf8');
          const isSwapped = await setClaudeGroveOauthSwapped({
            brainAuthPath: grove.brainAuthPath,
            refreshTokenBefore: 'refresh.a.1',
            oauth: oauthB,
          });
          return {
            isSwapped,
            before,
            after: readFileSync(grove.brainAuthPath, 'utf8'),
          };
        });

        then('it backs off', () => {
          expect(scene.isSwapped).toEqual(false);
        });

        then('the session login is left byte for byte', () => {
          expect(scene.after).toEqual(scene.before);
        });
      });
    },
  );
});
