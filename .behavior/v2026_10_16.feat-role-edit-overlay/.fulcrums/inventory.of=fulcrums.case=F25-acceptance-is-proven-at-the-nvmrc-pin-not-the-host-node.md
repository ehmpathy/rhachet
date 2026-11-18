# F25 — acceptance is proven at the .nvmrc pin, not the host node, at 5.3

## .the fork

the full acceptance tier on this host (node v24.20.0) failed 7 suites, 91 tests. two of the seven
were this branch's (`cli.thinImportPath`, at 823 module loads) and are fixed. the keyrack suites
failed with `connect EINVAL`, and `importEsmSafe.realnode` drew an extra `module.exports` key. ci
runs node at the `.nvmrc` pin, v22.21.0.

- (a) prove the full tier at the pin, as ci does (`rhx test.at.pin`), and fix each host-only failure
  in this pr
- (b) prove the full tier at the pin alone, and defer the host-only failures

## .taken — (a), and why

- the stone asks every failure fixed, pre-extant ones included, so the host failures are fixed here:
  - `importEsmSafe.realnode`: the probe drops the host's `module.exports` key; the snapshot holds on
    v22 and v24 alike
  - the keyrack suites: `genKeyrackRuntimeDir` gives each daemon a short runtime dir (a symlink in
    the host runtime base that points into the test's temp dir), and fails loud past `sun_path`.
    measured: the scope `path://blackbox/(sdk|cli)/keyrack\.(get|source|machine|reach)`, 17 files,
    passes 765/765 on the host and 765/765 at the pin
- the full tier is proven at the pin, the node ci gates the merge on; `rhx node.version.check`
  names the host drift

## .rework

clean — a re-run of the full tier on the host, if the wisher asks for one; no code moves.

## .confidence — 80%, and why it is not higher

the full tier ran end to end at the pin only. on the host, each failure the first full run found is
fixed and its scope re-proven, but the whole tier was not re-run there (a full local sweep is
forbidden).

## .where

- `.agent/repo=.this/role=any/skills/test.at.pin.sh`, `node.version.check.sh`
- `blackbox/.test/infra/probe.importEsmSafe.cjs`, `blackbox/.test/infra/genKeyrackRuntimeDir.ts`
- `.behavior/v2026_10_16.feat-role-edit-overlay/5.3.verification.yield.md`

## .verdict

open
