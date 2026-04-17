# proof of concept: defect state

## findings

timestamp: observed on 2026-04-16 POC

### discovery trace

how we found the daemon process:

1. read `getKeyrackDaemonSocketPath.ts` — socket path format is `$XDG_RUNTIME_DIR/keyrack.$SESSION.$HOMEHASH.$owner.sock`

2. read `getHomeHash.ts` — home hash is truncated sha256 of `$HOME`

3. computed home hash:
```bash
printf '/home/vlad' | sha256sum | head -c 8
# → 83db27ef
```

4. found PID file:
```bash
# searched /run/user/1000 for keyrack.*.83db27ef.*
# → /run/user/1000/keyrack.4.83db27ef.ehmpath.pid
```

5. read PID:
```bash
cat /run/user/1000/keyrack.4.83db27ef.ehmpath.pid
# → 3919920
```

6. verified process alive:
```bash
cat /proc/3919920/cmdline
# → node ... startKeyrackDaemon({ socketPath: "...ehmpath.sock" })
```

7. verified socket exists:
```bash
file /run/user/1000/keyrack.4.83db27ef.ehmpath.sock
# → socket
```

### daemon state

| artifact | path | value |
|----------|------|-------|
| PID file | /run/user/1000/keyrack.4.83db27ef.ehmpath.pid | 3919920 |
| socket file | /run/user/1000/keyrack.4.83db27ef.ehmpath.sock | exists (type: socket) |
| process | /proc/3919920/cmdline | alive, runs keyrack daemon |

### failure

```
$ rhx keyrack status --owner ehmpath

UnexpectedCodePathError: daemon STATUS command failed
{
  "error": "UnexpectedCodePathError: no ss output for socket inode\n\n{\n  \"inode\": \"2367234854\"\n}"
}
```

### analysis

1. daemon process alive (PID 3919920)
2. socket file exists
3. client connects to socket successfully
4. daemon receives command
5. daemon calls `ss -xp` to verify caller session
6. `ss` returns no output for the socket inode
7. daemon throws `UnexpectedCodePathError`

the daemon cannot process ANY commands in this state.
`keyrack daemon prune` also fails with the same error.

## proof of solution

### steps executed

```bash
# step 1: kill daemon process
kill 3919920
# daemon exited and cleaned up socket + PID files on exit

# step 2: verify daemon gone
rhx keyrack status --owner ehmpath
# → daemon: not found

# step 3: unlock spawns fresh daemon
rhx keyrack unlock --owner ehmpath --env test
# → [keyrack-daemon] spawned background daemon (pid: 687954)
# → 🔓 keyrack unlock
```

### result

**solution validated.** kill via SIGTERM → fresh daemon spawn → command succeeds.

### note

the daemon cleaned up its own socket + PID files on SIGTERM exit. the recovery flow can rely on:
1. send SIGTERM to PID from PID file
2. daemon cleans up on exit (or files already gone if process dead)
3. spawn fresh daemon
4. retry command

## critical discovery: systemic issue

fresh daemon (PID 687954) **immediately** fails with same error:

```
UnexpectedCodePathError: no ss output for socket inode
{ "inode": "2370788919" }
```

this is NOT daemon staleness. `ss -xp` is consistently broken on this machine. the fix we're implementing will NOT help — the fresh daemon has the same problem.

### root cause hypothesis

the `ss -xp` command requires elevated privileges or specific kernel config to return peer process info. on this machine, it returns no output for any socket inode.

### implication for fix

the reactive recovery (kill → respawn → retry) will NOT work if `ss` is systemically broken. the retry will fail too.

need to investigate:
1. why `ss -xp` returns no output
2. whether this is a permission issue
3. whether there's an alternative to `ss` for peer PID lookup

---

## root cause identified

see `poc.root-cause-investigation.md` for details.

**summary**: signed vs unsigned integer mismatch between `/proc/self/fd` (unsigned) and `ss -xp` (signed 32-bit). when socket inode > 2^31, they don't match on grep.

**implication**: the vision needs to change from "reactive daemon restart" to "fix the peer PID lookup mechanism". the daemon itself is not unhealthy — the `ss`-based peer lookup is fundamentally broken for high inodes.
