import type { KeyrackHostManifest } from '@src/domain.objects/keyrack/KeyrackHostManifest';
import type { KeyrackKeyOmission } from '@src/domain.objects/keyrack/KeyrackKeyOmission';

import { asKeyrackSlugParts } from './asKeyrackSlugParts';
import { asKeyrackKeyReachExid } from './reach/asKeyrackKeyReachExid';
import { getAllKeyrackReachesForSlug } from './reach/getAllKeyrackReachesForSlug';

/**
 * .what = name the fix for a key an unlock had to omit — the `tip:` leaf under an
 *   `absent`/`lost`/`remote` branch
 * .why = a key reported `absent` has two very different causes, and the remedy inverts between
 *   them. a key the manifest does NOT hold wants a `set`. a key the manifest DOES hold, but only
 *   AT A REACH, wants an `unlock --reach` — it was never absent at all, it is simply unreachable
 *   from a reachless ask. one tip for both cases names the wrong move for the second
 *
 * .note = the reachless `set` tip, handed to a human whose key is held at a reach, is ACTIVELY
 *   HARMFUL: obeyed literally it cuts a reachless TWIN under a slug already cut at reaches, and
 *   the original unlock still fails afterwards with no signal that a duplicate now exists. worse
 *   from inside a repo whose manifest names an org, a bare `set` files the twin at TREE grain
 *   (`{org}.{env}.KEY`) when the ask needed the GROVE-grain `@all.{env}.KEY` — a cross-grain write
 *   (`rule.require.org-scope-grain-hardcut`)
 * .note = it names the fix rather than merely drops the tip. to render no tip at all would trade
 *   one `rule.require.errors-name-the-fix` breach for another — the human would meet a bare
 *   `absent` with no way forward, on a key that is genuinely held and genuinely readable
 * .note = the reach is read off each entry's own `reach` field and its slug off `slug`, NEVER
 *   parsed out of the address-keyed map key — an address is construct-only, because a reach exid
 *   is an email and legally holds `@` (`term=address`)
 */
export const asKeyrackOmittedKeyTip = (input: {
  slug: string;
  reason: KeyrackKeyOmission['reason'];
  reach?: KeyrackKeyOmission['reach'];
  hostManifest: KeyrackHostManifest | null;
}): string => {
  const { org, env, keyName } = asKeyrackSlugParts({ slug: input.slug });

  // the reaches an `unlock --reach` could ACTUALLY serve for this slug, sorted so one rack
  // renders one tip, every run
  //
  // ⚠️ `only: 'vault-addressable'` carries real weight, and is not a refinement. an
  //    UNADDRESSABLE vault (`os.envvar`, `github.secrets`, `aws.params`) stores one value per
  //    bare name, so a reach-ask against it is refused outright by
  //    `assertKeyrackReachAddressable`. to name such a reach here would hand the human a command
  //    guaranteed to fail — a SECOND error, of a wholly different cause, on a credential this
  //    very tip just called reachable. that is the exact misdirection this transformer exists to
  //    end, merely on a third axis (`rule.require.errors-name-the-fix`). the `set` fallback below
  //    is the RIGHT move there: such a vault holds no per-reach slot at all, so its reachless
  //    value IS the value
  //
  // .note = the ONE shared answer to "which reaches does the rack hold", never a second
  //         hand-rolled scan. the inline copy this replaced had already drifted from it — it
  //         omitted the `env=all` twin and deduped only by accident (`rule.prefer.wet-over-dry`
  //         is crossed here: two sites, one question, and they had already diverged)
  const reachesHeld = getAllKeyrackReachesForSlug(
    { hosts: input.hostManifest?.hosts ?? {}, slug: input.slug },
    { only: 'vault-addressable' },
  ).map((reach) => reach.exid);

  // ⛔ THE ROW'S OWN REACH LEADS, whenever the row names one. a reachless bulk unlock
  //    enumerates one target per reach the rack holds, so ONE slug files several rows in a
  //    single run — and each row already renders a `reach:` leaf that names the account which
  //    failed. absent this, every such row rendered the SAME tip (the sorted first), so the
  //    row that read `reach: casey@ahction.com` was tipped to re-cut `casey@ahbode.com`: a
  //    tip that CONTRADICTS the very leaf above it, and which obeyed literally re-cuts the
  //    wrong account while the failed one stays lost (`rule.forbid.ambiguous-labels`,
  //    `rule.forbid.friction-hazards`)
  //
  // ⚠️ gated on membership of `reachesHeld`, and the gate carries real weight rather than
  //    guards defensively. `reachesHeld` is already narrowed to `vault-addressable`, so a row
  //    whose reach the VAULT cannot address can never promote it — such a reach would be
  //    tipped into a command `assertKeyrackReachAddressable` refuses outright, which is the
  //    exact second-error misdirection this transformer exists to end
  const reachOfRow = input.reach
    ? asKeyrackKeyReachExid({ reach: input.reach })
    : null;
  const reachToName =
    reachOfRow && reachesHeld.includes(reachOfRow)
      ? reachOfRow
      : reachesHeld[0];

  // the peers are every OTHER reach the rack holds — computed against whichever reach was
  // named above, so the named one never also appears in its own disclosure
  const reachesPeer = reachesHeld.filter((exid) => exid !== reachToName);

  // ⚠️ the rack may hold this slug at SEVERAL reaches, and a command may name only ONE of them.
  //    to name one in silence would read as "this key has one reach" — an unambiguous claim, and
  //    a false one (`rule.forbid.ambiguous-labels`). so the peers ride along, and the human sees
  //    the full set and picks rather than obeys a pick made for them
  //
  // ⛔ it is a SHELL COMMENT, and that is the whole point rather than a flourish. a tip is the
  //    one line a human copy-pastes, and prose appended after a command travels with the paste
  //    as stray positional args — so the tool's own hint would fail the moment it is used, which
  //    is the "actively harmful help" class `rule.forbid.friction-hazards` grades worst. behind
  //    a `#` the disclosure is visible to the reader and invisible to the shell: the whole line
  //    stays runnable exactly as rendered
  // .note = the sorted order (`getAllKeyrackReachesForSlug`) keeps one rack rendered one way
  const disclosure = reachesPeer.length
    ? `  # also cut at: ${reachesPeer.join(', ')}`
    : '';

  // held at a reach, and the cause is that the ASK could not see it — the key is present, so
  // the fix is to ASK at a reach, never to cut a twin
  //
  // ⚠️ gated on `absent`, and the gate is load-bearing. `lost` (the vault no longer holds the
  //    value) and `remote` (a write-only vault whose `get` is null) are faults of the STORE,
  //    not of the ask — an `unlock --reach` re-runs the very read that just failed and omits
  //    the key again for the same reason. to tip it would be the exact misdirection this
  //    transformer exists to end, merely aimed at a different cause
  //    (`rule.require.errors-name-the-fix`). those causes want a `set` — re-store the value
  if (reachToName && input.reason === 'absent')
    return `rhx keyrack unlock --key ${keyName} --env ${env} --reach ${reachToName}${disclosure}`;

  // otherwise the fix is to cut (or re-cut) the key.
  //
  // ⚠️ a MACHINE-WIDE slug must carry `--org @all`. without it, `set` infers grain from the
  //    repo manifest — so from a repo whose manifest names an org the tip files a TREE-grain
  //    `{org}.{env}.KEY` when the failed unlock needed the GROVE-grain `@all.{env}.KEY`, a
  //    silent cross-grain write (`rule.require.org-scope-grain-hardcut`) that leaves the
  //    unlock just as broken. from a cwd with no manifest at all a bare `set` has no org to
  //    infer and errors outright
  //
  // ⛔ and a slug held ONLY at reaches must carry `--reach` too, or the re-store lands at the
  //    WRONG ADDRESS. on an addressed vault a bare `set` files a new REACHLESS entry under the
  //    same slug — it does not restore the lost reach-cut credential — so the unlock still fails
  //    afterwards and a twin now exists under a slug already cut at a reach. that is the exact
  //    twin this transformer's `.note` says it exists to prevent, merely reached through the
  //    `lost`/`remote` door rather than the `absent` one
  // .note = `reachesHeld` is already narrowed to `vault-addressable`, so an UNADDRESSABLE vault
  //         yields none and this stays a bare `set` — which is CORRECT there: such a vault holds
  //         one value per bare name, so its reachless value IS the value. a rack with no reaches
  //         at all likewise yields none, so every extant tip is byte-identical
  const orgFlag = org === '@all' ? ' --org @all' : '';
  const reachFlag = reachToName ? ` --reach ${reachToName}` : '';
  return `rhx keyrack set --key ${keyName} --env ${env}${orgFlag}${reachFlag}${disclosure}`;
};
