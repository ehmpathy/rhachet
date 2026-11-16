import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';
import { asClaudeUsageReplyDrift } from '@src/domain.operations/brain/auth/account/claude/asClaudeUsageReplyDrift';
import type { ContextBrainAuthAccount } from '@src/domain.operations/brain/auth/account/genContextBrainAuthAccount';
import { getBrainAuthPath } from '@src/domain.operations/brain/auth/getBrainAuthPath';

/**
 * .what = an in-memory keyrack and a fake claude provider, as a brain auth account context
 * .why = the `set`, `get` and `use` ops run whole over a temp home with no real seat; the order of
 *   writes is the real code's, and the fakes keep score
 * .note = the provider holds the one rule that matters: a refresh token is single use. a mint
 *   spends the token it was given and issues a new pair for the same account; a spent token mints
 *   as `dead`, as the real provider answers. so a test proves "each token has one holder" by a mint
 * .note = a login opens the account its email names, unless the login was issued for another one
 *   (one email in two orgs, a7)
 * .note = tokens are plain labels (`refresh.<email>.<n>`), never a real key shape
 * .note = the maps below are the fakes' own record, so each write to them is deliberate mutation
 */
export const genMockedContextBrainAuthAccount = (input: {
  accounts: BrainAuthAccount[];
  options?: {
    mintRateLimited?: string[];
    usageRateLimited?: string[];
    usageReplies?: Record<string, unknown>;
  };
}): {
  context: ContextBrainAuthAccount;
  keyrack: Map<string, string>;
  provider: {
    issueLogin: (input: { email: string; account?: BrainAuthAccount }) => {
      accessToken: string;
      refreshToken: string;
    };
    isLive: (input: { refreshToken: string }) => boolean;
    mints: string[];
    onProfile: Array<(input: { email: string }) => void>;
  };
  setLoginOnSpawn: (input: { email: string | null }) => void;
  spawns: Array<{ cwd: string; configDir: string | null }>;
} => {
  const accountByEmail = new Map(
    input.accounts.map((account) => [account.email, account]),
  );
  const keyrack = new Map<string, string>();
  const refreshLive = new Map<string, BrainAuthAccount>(); // refresh token → the account it opens
  const accessLive = new Map<string, BrainAuthAccount>(); // access token → the account it opens
  const issued = { count: 0 };
  const mints: string[] = [];
  const onProfile: Array<(input: { email: string }) => void> = [];
  const loginOnSpawn: { email: string | null } = { email: null };
  const spawns: Array<{ cwd: string; configDir: string | null }> = [];

  // issue a fresh pair for an account; the provider's side of a login or a mint
  const issueLogin = (args: { email: string; account?: BrainAuthAccount }) => {
    const account = args.account ?? accountByEmail.get(args.email);
    if (!account) throw new Error(`no sample account for ${args.email}`);
    issued.count += 1; // deliberate mutation: the fake provider's serial
    const accessToken = `access.${args.email}.${issued.count}`;
    const refreshToken = `refresh.${args.email}.${issued.count}`;
    accessLive.set(accessToken, account); // deliberate mutation: the fake provider's record
    refreshLive.set(refreshToken, account); // deliberate mutation: the fake provider's record
    return { accessToken, refreshToken };
  };

  const context: ContextBrainAuthAccount = {
    getSlotToken: async ({ email }) => {
      const token = keyrack.get(email);
      return token
        ? { status: 'granted', token }
        : { status: 'absent', fix: null };
    },
    setSlotToken: async ({ email, token }) => {
      keyrack.set(email, token); // deliberate mutation: the fake keyrack's store
    },
    delSlotToken: async ({ email }) => {
      keyrack.delete(email); // deliberate mutation: the fake keyrack's store
    },
    getSlotEmails: async () => [...keyrack.keys()].sort(),
    assertSlotWritable: async () => {
      // the in-memory keyrack always holds a manifest; an absent one is proven over the real keyrack
    },
    mint: async ({ refreshToken }) => {
      const account = refreshLive.get(refreshToken);
      if (!account) return { status: 'dead' };
      mints.push(account.email); // deliberate mutation: the fake provider's record of each mint
      if (input.options?.mintRateLimited?.includes(account.email))
        return { status: 'rate-limited' };
      refreshLive.delete(refreshToken); // deliberate mutation: a refresh token is single use
      const pair = issueLogin({ email: account.email, account });
      return {
        status: 'ok',
        ...pair,
        expiresAt: Date.now() + 3_600_000,
        scopes: ['user:inference', 'user:profile'],
      };
    },
    getProfile: async ({ accessToken }) => {
      const account = accessLive.get(accessToken);
      if (!account) return { status: 'dead' };
      onProfile.forEach((hook) => hook({ email: account.email }));
      return { status: 'ok', account };
    },
    getUsageReply: async ({ accessToken }) => {
      const account = accessLive.get(accessToken);
      if (!account) return { status: 'dead' };
      if (input.options?.usageRateLimited?.includes(account.email))
        return { status: 'rate-limited' };
      const reply = input.options?.usageReplies?.[account.email] ?? {
        five_hour: { utilization: 20, resets_at: null },
        seven_day: { utilization: 40, resets_at: null },
      };

      // the real reader reads a drifted reply as unreadable; so does the fake
      if (asClaudeUsageReplyDrift({ reply })) return { status: 'unreadable' };
      return { status: 'ok', reply };
    },
    spawnLogin: ({ env, cwd }) => {
      // the human's browser login, as the cli would leave it in its config dir
      spawns.push({ cwd, configDir: env.CLAUDE_CONFIG_DIR ?? null }); // deliberate mutation: the fake cli's record of each spawn
      const email = loginOnSpawn.email;
      if (!email) return { error: null };
      const pair = issueLogin({ email });
      const path = join(env.CLAUDE_CONFIG_DIR ?? '', '.credentials.json');
      writeFileSync(path, asLoginFile({ ...pair }));
      return { error: null };
    },
    sleep: async () => undefined,
  };

  return {
    context,
    keyrack,
    provider: {
      issueLogin,
      isLive: ({ refreshToken }) => refreshLive.has(refreshToken),
      mints,
      onProfile,
    },
    setLoginOnSpawn: ({ email }) => {
      loginOnSpawn.email = email; // deliberate mutation: the next spawn's login
    },
    spawns,
  };
};

/**
 * .what = write a grove login file for a pair, live for an hour or lapsed
 * .why = the `use` and `get` suites start from a grove signed in on some account
 */
export const setSampleGroveLogin = (input: {
  home: string;
  pair: { accessToken: string; refreshToken: string };
  lapsed?: boolean;
}): void => {
  const path = getBrainAuthPath({ home: input.home });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    asLoginFile({ ...input.pair, lapsed: input.lapsed ?? false }),
  );
};

/**
 * .what = the content of a claude login file for a pair
 */
const asLoginFile = (input: {
  accessToken: string;
  refreshToken: string;
  lapsed?: boolean;
}): string =>
  JSON.stringify({
    claudeAiOauth: {
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.lapsed ? Date.now() - 60_000 : Date.now() + 3_600_000,
      scopes: ['user:inference', 'user:profile'],
      subscriptionType: 'max',
    },
  });
