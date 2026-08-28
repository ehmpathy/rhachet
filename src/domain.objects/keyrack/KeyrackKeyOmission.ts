import type { KeyrackKeyReach } from './KeyrackKeyReach';

/**
 * .what = why one credential was NOT granted, and which of its reaches that verdict was on
 * .why = `KeyrackKeyGrant` names the SUCCESS half of an unlock; its twin — what an unlock
 *   reports when a key does not come back — had no name at all. the identical literal shape
 *   was hand-copied at five sites across three files (the loop's accumulator, the declared
 *   return, the exit-code read, the tip transformer, and the render union's own tags), so the
 *   compiler tied none of them together
 *
 * .note = ⚠️ the four-way `reason` is a PUBLISHED contract — it is the exit-code input
 *   (`asKeyrackUnlockExitCode`) and the render's discriminant (`emitKeyrackKeyBranch`). a fifth
 *   value is therefore a contract change, and with five hand-synced copies it was one a
 *   compiler could not see. named once, an added reason lights up every site that must answer
 *   for it (`rule.require.ubiqlang`, `rule.prefer.wet-over-dry` — five copies is well past three)
 * .note = an INTERFACE, never a DomainLiteral. an omission is a transient report an unlock
 *   returns and a render consumes — it is never stored, never keyed, never compared for
 *   identity, so the runtime-validation and identity machinery a domain object carries would
 *   serve no reader here (`rule.forbid.io-as-domain-objects`)
 * .note = `reach` is OPTIONAL, never nullable — `JSON.stringify` drops an absent field but
 *   emits a null one, so `null` would move every extant json payload and snapshot
 */
export interface KeyrackKeyOmission {
  /**
   * .what = the slug the omission is reported on — never an address
   * .why = the reach rides its own field beside this one. to fold it into the slug would
   *   re-open the address-vs-slug conflation this whole repair closed (`term=address`)
   */
  slug: string;

  /**
   * .what = why the credential did not come back
   * .why = the remedy INVERTS between these, so one label for all four would name the wrong
   *   move for three of them (`rule.require.errors-name-the-fix`)
   *
   * - `absent`  — the rack does not hold it at the shape asked for
   * - `lost`    — the rack holds a record, but the vault no longer serves the value
   * - `remote`  — a write-only vault, whose `get` is null by construction
   * - `errored` — a live operational fault, isolated so one flaky key never aborts a batch
   */
  reason: 'absent' | 'lost' | 'remote' | 'errored';

  /**
   * .what = the fault beneath an `errored` row, when one was caught
   * .why = such a row owes the human the cause, never merely the symptom
   */
  cause?: unknown;

  /**
   * .what = the reach of the target this verdict was actually on
   * .why = one slug can file SEVERAL rows in one run, since a reachless ask enumerates one
   *   target per reach the rack holds. absent this field, two rows of one slug render
   *   byte-identical and a human cannot tell which account failed — or that two accounts are
   *   involved at all rather than a duplicate-render defect (`rule.forbid.ambiguous-labels`)
   */
  reach?: KeyrackKeyReach;
}
