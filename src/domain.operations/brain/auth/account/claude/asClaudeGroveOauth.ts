import { asBrainAuthOauth } from '@src/domain.operations/brain/auth/asBrainAuthOauth';

/**
 * .what = the whole oauth block of a grove's claude login file, or null when it holds no usable one
 * .why = the signed-in read needs the live access token and its expiry; the swap must read the live
 *   refresh token for its compare-and-swap, and write the block whole (case=3, case=9)
 * .note = `asBrainAuthOauth` reaches the block and answers "is a refresh token there"; this
 *   narrows every field of the block it reached
 * .note = a token field that is absent or not a string reads the whole block as null: a half block
 *   is not a login rhachet may judge or swap
 */
export const asClaudeGroveOauth = (input: {
  content: string | null;
}): {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
  scopes: string[];
  subscriptionType: string | null;
} | null => {
  // reach the oauth object via the one reader of the shape
  const reached = asBrainAuthOauth({ content: input.content });
  if (!reached) return null;
  const oauth = reached.block;

  // require both tokens
  if (
    typeof oauth.accessToken !== 'string' ||
    typeof oauth.refreshToken !== 'string'
  )
    return null;
  if (oauth.refreshToken === '') return null;

  return {
    accessToken: oauth.accessToken,
    refreshToken: oauth.refreshToken,
    expiresAt: typeof oauth.expiresAt === 'number' ? oauth.expiresAt : null,
    scopes: Array.isArray(oauth.scopes)
      ? oauth.scopes.filter(
          (scope): scope is string => typeof scope === 'string',
        )
      : [],
    subscriptionType:
      typeof oauth.subscriptionType === 'string'
        ? oauth.subscriptionType
        : null,
  };
};
