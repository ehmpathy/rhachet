import { createAppAuth } from '@octokit/auth-app';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { addDuration, asIsoTimeStamp } from 'iso-time';

import type { KeyrackGrantMechanismAdapter } from '@src/domain.objects/keyrack';

import { createInterface } from 'node:readline';
import { runGh } from '../../infra/gh/runGh';
import { genGithubAppSource } from './genGithubAppSource';

/**
 * .what = expected shape of github app credentials json
 * .why = validates that stored value contains required fields
 */
interface GithubAppCredentials {
  appId: string | number;
  privateKey: string;
  installationId: string | number;
}

/**
 * .what = parse and validate github app credentials json
 * .why = ensures stored value has required fields for token generation
 */
const parseGithubAppCredentials = (
  value: string,
):
  | { valid: true; creds: GithubAppCredentials }
  | { valid: false; reasons: string[] } => {
  // attempt to parse as json
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { valid: false, reasons: ['value is not valid json'] };
  }

  // validate required fields
  if (typeof parsed !== 'object' || parsed === null) {
    return { valid: false, reasons: ['value is not a json object'] };
  }

  const obj = parsed as Record<string, unknown>;

  if (!obj.appId && !obj.app_id) {
    return { valid: false, reasons: ['json lacks appId or app_id field'] };
  }

  if (!obj.privateKey && !obj.private_key) {
    return {
      valid: false,
      reasons: ['json lacks privateKey or private_key field'],
    };
  }

  if (!obj.installationId && !obj.installation_id) {
    return {
      valid: false,
      reasons: ['json lacks installationId or installation_id field'],
    };
  }

  // normalize field names
  const creds: GithubAppCredentials = {
    appId: (obj.appId ?? obj.app_id) as string | number,
    privateKey: (obj.privateKey ?? obj.private_key) as string,
    installationId: (obj.installationId ?? obj.installation_id) as
      | string
      | number,
  };

  return { valid: true, creds };
};

/**
 * .what = mechanism adapter for github app credentials
 * .why = translates stored app credentials json into short-lived installation token
 *
 * .note = expects json with appId, privateKey, installationId
 * .note = generates short-lived (1 hour) installation access token
 */
export const mechAdapterGithubApp: KeyrackGrantMechanismAdapter = {
  /**
   * .what = validate that value is valid github app credentials json
   * .why = ensures stored credential can be translated to token
   *
   * .note = source expects json blob with appId, privateKey, installationId
   * .note = cached expects ghs_ token (already translated)
   */
  validate: (input) => {
    // validate cached ephemeral (ghs_ token)
    if (input.cached) {
      if (!input.cached.startsWith('ghs_')) {
        return { valid: false, reasons: ['cached value must be ghs_ token'] };
      }
      return { valid: true };
    }

    // validate source credential (json blob)
    if (input.source) {
      const result = parseGithubAppCredentials(input.source);
      if (!result.valid) {
        return {
          valid: false,
          reasons: result.reasons.map((r) => `github_app: ${r}`),
        };
      }
      return { valid: true };
    }

    return { valid: false, reasons: ['no value to validate'] };
  },

  /**
   * .what = acquire source credential via guided setup
   * .why = discovers the app from keyrack-infra (admin-free), then prompts for pem
   *
   * .note = keySlug is fully qualified (org.env.name); org is derived from it, UNLESS a
   *         reach names a different reach — then that reach's org is used instead.
   *         either way the lookup is the same admin-free keyrack-infra gate
   * .note = requires the org's keyrack-infra repo to exist (mandatory)
   * .note = registry-first discovery; admin install-list is only a fallback that
   *         auto-registers the chosen app so future members can discover it
   */
  acquireForSet: async (input, options) => {
    // gh runner: injected (composition root / tests) or the real gh cli
    const ghRun = options?.ghRun ?? runGh;

    // if a prompt is injected (tests), use it directly — no real terminal needed
    if (options?.question) {
      return await genGithubAppSource(
        { keySlug: input.keySlug, reach: input.reach },
        { ghRun, question: options.question },
      );
    }

    // a lazily-guarded readline prompt. discovery (gh api calls — no stdin) runs first inside
    // genGithubAppSource; the no-TTY guard fires ONLY at the point a real pem prompt is reached.
    // so an infra-absent / ask-an-admin discovery failure surfaces its OWN specific error before
    // any prompt is attempted (the guard no longer preempts discovery). unattended `set` of a
    // github-app key still fails loud — the moment a real prompt is needed on a non-terminal
    // stdin. the symmetric twin of inferKeyrackMechForSet's guard, deferred to the actual read
    // an object holder (not a bare let) so the readline handle stays typed across the closure
    // reassignment for the finally-block cleanup
    const held: { rl: ReturnType<typeof createInterface> | null } = {
      rl: null,
    };
    const question = (prompt: string): Promise<string> => {
      // the guided pem prompt has no answer when stdin is not a terminal (an unattended
      // provision task, a piped/redirected stdin). fail loud — name the fix — rather than open a
      // readline that blocks forever on a read no process can answer
      if (!process.stdin.isTTY)
        throw new ConstraintError(
          'a github app credential prompt is required but stdin is not a terminal',
          {
            keySlug: input.keySlug,
            hint: 'run set from a terminal to supply the github app credential, or inject a question in tests',
          },
        );

      // open the real readline once, on first prompt
      if (!held.rl)
        held.rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });
      const active = held.rl;
      return new Promise((done) => {
        active.question(prompt, (answer) => done(answer));
      });
    };

    try {
      // the orchestrator holds the testable flow with every dependency injected
      return await genGithubAppSource(
        { keySlug: input.keySlug, reach: input.reach },
        { ghRun, question },
      );
    } finally {
      held.rl?.close();
    }
  },

  /**
   * .what = deliver usable secret from stored source credential
   * .why = transforms github app credentials json to installation access token
   *
   * .note = tokens expire in 1 hour; we set expiresAt to 55 min for clock drift buffer
   */
  deliverForGet: async (input) => {
    const result = parseGithubAppCredentials(input.source);
    if (!result.valid) {
      throw new MalfunctionError(
        'github_app deliverForGet called with invalid credentials',
        { reasons: result.reasons },
      );
    }

    const { creds } = result;

    // create auth instance
    const auth = createAppAuth({
      appId: creds.appId,
      privateKey: creds.privateKey,
      installationId: Number(creds.installationId),
    });

    // generate installation access token
    // .note = a malformed pem makes node's crypto throw a DOMException deep in
    //         @octokit/auth-app; uncaught it crashes the process with a raw stack dump.
    //         a bad pem is caller-fixable (they stored an invalid key file), so convert
    //         ONLY the key/crypto failure to a ConstraintError with a hint — every other
    //         fault (network, rate limit, 4xx) is re-thrown untouched (no failhide)
    const token = await (async () => {
      try {
        const minted = await auth({ type: 'installation' });
        return minted.token;
      } catch (error) {
        // allowlist: only the private-key parse/crypto failure is caller-fixable here.
        // the crypto DOMException nests the root reason on its `cause`; read it defensively
        // without relying on the es2022 Error.cause typing
        const rootCause =
          error instanceof Error &&
          'cause' in error &&
          (error as { cause?: unknown }).cause instanceof Error
            ? (error as { cause: Error }).cause.message
            : '';
        const text = [
          error instanceof Error ? error.message : String(error),
          rootCause,
        ].join(' ');
        const isKeyFault =
          /invalid keydata|failed to read private key|DECODER|unsupported|asn1|pem/i.test(
            text,
          );
        if (!isKeyFault) throw error; // re-throw non-key faults untouched

        throw new ConstraintError(
          'failed to mint github app token — the stored private key (.pem) is not a valid rsa key',
          {
            appId: creds.appId,
            hint: 're-set the key with a valid github app private key (.pem) file',
            reason: text.trim(),
          },
        );
      }
    })();

    // github installation tokens expire in 1 hour; buffer 5 min for clock drift
    const expiresAt = addDuration(asIsoTimeStamp(new Date()), { minutes: 55 });

    return { secret: token, expiresAt };
  },
};
