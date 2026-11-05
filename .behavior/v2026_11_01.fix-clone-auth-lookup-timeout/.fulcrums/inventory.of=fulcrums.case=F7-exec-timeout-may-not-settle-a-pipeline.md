# F7 — the exec timeout may not settle a shell pipeline at its bound

- **fork**: `getSocketPeerCred` runs `sh -c 'ss -xp | grep -E "<inode>" || true'` under
  `exec({ timeout })`. node signals the `sh` child on timeout; `exec` settles on `close`, which
  waits for every holder of the stdout pipe. `grep` holds it until `ss` ends. if that holds, the
  timeout does not bound the lookup — it only marks the eventual result as killed. two paths:
  (a) keep the shell and just raise the number; (b) drop the shell: `execFile('ss', ['-xp'])`,
  filter for the inode in node, `maxBuffer` sized for a full socket table, so the timeout signals
  `ss` itself
- **taken**: measure first, at the start of execution, against a fake `ss` that sleeps. if the
  promise settles at the bound → (a). if it settles only when the fake `ss` exits → (b), since the
  wish requires a slow lookup to end at the lookup, never at the gate
- **rework**: clean — confined to `getSocketPeerCred`'s exec call; the parse
  (`asSocketPeerPidFromSs`) already matches whole lines by exact inode
- **confidence**: 60% that (b) will be needed — inferred from node's documented `close` semantics,
  not yet measured (`rule.require.refute-a-premise-with-a-measurement`)
- **where**: `src/infra/socket/getSocketPeerCred.ts:66-69`
- **verdict**: measured 2026-11-01 — (a). a throwaway integration test ran
  `sh -c '<fake ss that sleeps 4s> -xp | grep -E "123" || true'` under `exec({ timeout: 1000 })`.
  the promise rejected at **1010ms**: `killed: true`, `signal: SIGTERM`,
  `Command failed: … ss -xp | grep -E "123" || true`. the bound settles the pipeline; the shell
  stays, no `execFile` rewrite. the premise inferred from `close` semantics was wrong — the
  measurement, not the inference, decides
