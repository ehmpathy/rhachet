# F7 — the refusal hint qualifies `--org @all`, rather than offer it bare

**the fork** — today's hint ends `or pass --org @all` (`asKeyrackOrgMismatchRefusal`). (a) keep it bare, as today · (b) drop it · (c) keep it last, qualified: `or, for a key that belongs to no org, pass --org @all`.

**taken** — (c). the wish's third workaround is a refile under `@all`, which it calls a falsehood for an org-owned key. a bare `@all` in the refusal points the human at that defect. but `@all` is still the honest grain for a key that belongs to no org, and a drop would hide a legal door. the qualifier keeps the door and names when it applies.

`--org @all` with a FULL slug (`--key aether.camp.AWS_PROFILE`) is not a refile — it is the gate bypass at `getOneKeyrackGrantByKey.ts:53-66`, which reads the org-owned key in place, read-only. on the flag variant of the refusal the rejected key is bare, so the clause lands on `@all.camp.AWS_PROFILE`, an honest `@all` key. on the slug variant (`--key aethr.camp.X`) it can only land on the bypass, which waives the firewall for a nonmember. so the slug-given refusal omits the `@all` clause; the flag variant keeps it, qualified.

**rework** — clean. one string in one transformer; the `keyrack.org-mismatch` snapshots already move under F5.

**confidence** — 70%. the exact words are taste; whether to keep `@all` at all is a real call the wisher may make the other way.

**where** — `case=5`.

**verdict** — open.
