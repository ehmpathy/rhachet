import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackGrantMechanism } from './KeyrackGrantMechanism';
import type { KeyrackKeyReach } from './KeyrackKeyReach';

/**
 * .what = optional injected dependencies for a mechanism's guided setup
 * .why = lets the composition root (and tests) supply the gh runner + the readline
 *        prompt so acquireForSet runs without the real `gh` cli or a real terminal;
 *        each mech uses only what it needs and falls back to real deps when absent
 *
 * .note = ghRun is shaped structurally here (not imported from domain.operations) to
 *         respect directional-deps — a domain.object must not import a domain.operation;
 *         the structural shape matches the GhRun type the operations layer defines
 */
export interface KeyrackMechAcquireOptions {
  ghRun?: (input: { args: string[] }) => {
    status: number | null;
    stdout: string;
    stderr: string;
  };
  question?: (prompt: string) => Promise<string>;
}

/**
 * .what = interface for mechanism-specific credential acquisition and delivery
 * .why = adapter pattern enables support for different credential types
 *
 * .note = vault adapters call these methods internally:
 *         - vault.set calls mech.acquireForSet to get source credential via guided setup
 *         - vault.get calls mech.deliverForGet to transform source → usable secret
 */
export interface KeyrackGrantMechanismAdapter {
  /**
   * .what = validate that a value matches the mechanism's expected format
   * .why = enables firewall to block long-lived tokens when mechanism forbids it
   *
   * .note = use { source } for source values from vault, { cached } for ephemeral values cached in os.direct
   */
  validate: (input: { source?: string; cached?: string }) => {
    valid: boolean;
    reasons?: string[];
  };

  /**
   * .what = acquire source credential via guided setup
   * .why = mech owns prompts for what it needs (e.g., org → app → pem for github app)
   *
   * .note = keySlug is fully qualified (org.env.name) for display in prompts
   * .note = mech discovers external resources independently (e.g., gh api /user/orgs)
   * .note = called by vault.set internally; secret never leaves vault scope
   * .note = options injects the gh runner + prompt (composition root / tests); when
   *         absent the mech falls back to the real gh cli and a real readline terminal
   * .note = reach names the reach this credential is cut for. a mech that opens exactly
   *         one reach per credential (github app) derives that reach's installation
   *         from it. a mech with NO reach facet MUST throw on a reach rather than ignore
   *         it — a silently dropped reach would store a credential that opens somewhere
   *         other than what the human asked for (e13)
   * .note = mech names WHICH mechanism identity invoked this adapter, and it is REQUIRED.
   *         an adapter is NOT 1:1 with a mech — the registry aliases several names onto one
   *         adapter (EPHEMERAL_VIA_GITHUB_OIDC onto the aws.sso adapter; PERMANENT_VIA_REFERENCE
   *         and EPHEMERAL_VIA_SESSION onto the replica adapter). so an adapter that names its
   *         own identity can only guess, and it guesses wrong for every alias. required rather
   *         than optional for the reason e13 teaches: an optional field is a droppable field,
   *         and a dropped mech would put the WRONG mech name in the refusal a human reads
   */
  acquireForSet: (
    input: {
      keySlug: string;
      reach?: KeyrackKeyReach;
      mech: KeyrackGrantMechanism;
    },
    options?: KeyrackMechAcquireOptions,
  ) => Promise<{ source: string }>;

  /**
   * .what = deliver usable secret from stored source credential
   * .why = some credentials require transformation (e.g., github app json → ghs_ token)
   *
   * .note = if expiresAt is returned, the translated value can be cached to os.direct
   * .note = called by vault.get internally; vault encapsulates the transformation
   */
  deliverForGet: (input: {
    source: string;
  }) => Promise<{ secret: string; expiresAt?: IsoTimeStamp }>;
}
