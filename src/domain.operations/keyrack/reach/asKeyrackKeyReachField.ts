import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';

/**
 * .what = casts an optional reach into the object fragment that carries it — `{ reach }`
 *         when a reach was named, and `{}` when one was not
 * .why = every shape that can hold a reach must OMIT the field when absent, never carry a
 *        `null` or an explicit `undefined`. that rule is e16, it is not obvious, and it was
 *        restated by hand at 14 sites — so the reason lived nowhere and had to be rederived
 *        at each one
 *
 * .note = e16, stated once and linked from every call site: `JSON.stringify` DROPS an
 *         `undefined` field and EMITS a `null` one. keyrack's json output is a bare
 *         `JSON.stringify`, so an omitted reach renders byte-identically to how it rendered
 *         before reach existed (e1) while `reach: null` would not. the same holds for the
 *         encrypted host manifest, which round-trips on every developer machine
 *         (rule.forbid.nullable-without-reason)
 *
 * .note = ⚠️ this does NOT prevent a reach from being dropped entirely — the failure that
 *         orphaned a credential at `os.daemon`. an author who forgets this call forgets it
 *         exactly as they would have forgotten the ternary. only a contract that a vault
 *         cannot satisfy without a decision — DERIVE, DECLARE, or REFUSE — closes that, and
 *         it is flagged as its own rework. what this DOES buy is one home for the e16
 *         reason, and one place to change the convention
 */
export const asKeyrackKeyReachField = (input: {
  reach?: KeyrackKeyReach;
}): { reach?: KeyrackKeyReach } => (input.reach ? { reach: input.reach } : {});
