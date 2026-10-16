# F17 — a masked `expires in:` keeps the shared masker's token

**the fork** — two suites mask the same `status` field two ways. the shared masker
`blackbox/.test/infra/maskKeyrackGrantVolatiles.ts` renders `expires in: __TIMESTAMP__`; a local
`.replace` chain in `keyrack.machine-wide-skips-manifest.acceptance.test.ts` renders `<TTL>`. (a) keep
the shared token · (b) move the shared masker to `<TTL>`, which reads truer for a countdown · (c) move
the local chain to `__TIMESTAMP__`.

**taken** — (a). the shared masker is the declared single point of determinism for every keyrack
journey and acceptance snapshot, and its `.note` names `__TIMESTAMP__` as the one masked-time token
on purpose, so a grant render and its json metadata read alike. it has its own unit, and three suites
pin its output. the new `org-allowlist` suite reuses it rather than a third local chain.

**why not (b)** — it is a taste change to a shared contract: one unit and four snapshot rows across
three suites move, and no reader is misled by the token, since the label `expires in:` already says
it is a duration.

**why not (c)** — the local chain masks `Nh Nm` and `Nm Ns` forms the shared masker does not, so it
is not a drop-in swap, and the suite is outside the allowlist concern.

**rework** — clean. one regex target and a resnap of four rows, whichever way the wisher rules.

**confidence** — 80%. (b) is a fair preference; the cost is low either way.

**where** — `blackbox/.test/infra/maskKeyrackGrantVolatiles.ts:24`.

**verdict** — ruled by the wisher: either works. (a) stands.
