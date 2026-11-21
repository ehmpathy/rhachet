# F28 — the upgrade hook count is pinned against the manifest, not in the snapshot

## .the fork

peer review 5.3 i002 r012 blocker.1: `upgrade.acceptance.test.ts` masks the `✨ hooks` counts as
`__N__` in its `case11` and `case12` summary snapshots, where they pinned `└─ 14 created`.

- **(a)** restore the literal count in the snapshot, and handle the registry drift in its own change
- **(b)** keep the mask in the snapshot; pin the count exactly in a `then`, equal to the rules the
  sync landed in the manifest

## .taken

(b). the fixtures install `rhachet-roles-ehmpathy@1.17.20`, then `upgrade` pulls whatever npm
published last. so the count belongs to the registry, not to this repo, and the `package.json`
bump in this diff does not set it. a literal count went red when 1.43.0 published (14 → 16), with no
change here, and goes red again on the next publish.

the count is still pinned exactly. `getHookCountCreated` reads `N created` and asserts it equals
`getManifestRuleCount`, the rule rows the sync wrote. a sync that drops or doubles a hook fails that
assert on any registry version. the snapshot still pins the shape: the header, the rows, their order.

## .rework

clean. restore the literal in two snapshots and drop the mask transformer.

## .confidence

85%. a literal is the stronger regression read on a frozen registry. the registry is not frozen,
and a test that reds on a third party's publish teaches readers to resnap blind.

## .where

`blackbox/cli/upgrade.acceptance.test.ts` (`asHookCountsMasked`, `getHookCountCreated`,
`getManifestRuleCount`)

## .verdict

reversed to (a) at 5.3 i003. the reviewer showed what (b) misses: a sync that drops or doubles
a hook in the manifest and in its count alike passes the equality check. an oracle apart from the
sync would need rhachet's own role loader, so it would not be apart. the literal (`16 created`) is
back in both snapshots, and the manifest equality asserts stay beside it. the publish drift that
reds the literal predates this pr; it is caught on its own:
`.dream/v2026_11_18.fix.upgrade-hook-count-pin-reds-on-each-upstream-publish.md`.
