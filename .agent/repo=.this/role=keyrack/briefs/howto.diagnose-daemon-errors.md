# howto.diagnose-daemon-errors

## .what

guide to diagnose keyrack daemon errors and test fixes locally.

## .key insight: daemon runs compiled code from dist/

the daemon is spawned via `node -e` with a require from `dist/`, not `src/`.

```
node -e 'require("/path/to/dist/.../startKeyrackDaemon.js")'
```

**implication**: a patch to TypeScript in `src/` does NOT affect a live daemon. you must:
1. rebuild: `npm run build`
2. prune daemon: `npx rhachet keyrack daemon prune --owner $owner`
3. next command spawns fresh daemon with new code

## .diagnose: which daemon is active

### find daemon artifacts

socket and PID files live in `$XDG_RUNTIME_DIR` (usually `/run/user/$UID`):

```
/run/user/1000/keyrack.$SESSION.$HOMEHASH.$owner.sock
/run/user/1000/keyrack.$SESSION.$HOMEHASH.$owner.pid
```

where:
- `$SESSION` = login session id (from `/proc/$PID/sessionid`)
- `$HOMEHASH` = first 8 chars of sha256 of `$HOME` realpath
- `$owner` = keyrack owner (e.g., `ehmpath`)

### compute home hash

```bash
printf '/home/vlad' | sha256sum | head -c 8
# → 83db27ef
```

### find daemon PID

```bash
cat /run/user/1000/keyrack.4.83db27ef.ehmpath.pid
# → 687954
```

### verify daemon is alive

```bash
cat /proc/687954/cmdline
# shows node command with startKeyrackDaemon require path
```

### check which code daemon uses

the cmdline shows the require path:
- global: `/home/.../.pnpm/global/.../rhachet@x.y.z/dist/...`
- local: `/home/.../your-worktree/dist/...`

## .diagnose: ss lookup failures

### symptom

```
UnexpectedCodePathError: no ss output for socket inode
{ "inode": "2367234854" }
```

### root cause: signed vs unsigned integer mismatch

`/proc/self/fd/$fd` shows inode as **unsigned** (e.g., `2367234854`).
`ss -xp` shows inode as **signed 32-bit** (e.g., `-1927732442`).

when inode > 2^31, they differ. grep for unsigned never finds signed.

### verify with ss output

```bash
ss -xp | head -50
```

look for socket identifiers. negative numbers like `-1929414262` are signed representations of high inodes.

### the math

```
unsigned_inode = 2367234854
signed_inode = 2367234854 - 4294967296 = -1927732442
```

## .test fixes locally

### 1. patch source in src/

edit the TypeScript file (e.g., `src/.../getSocketPeerPid.ts`).

### 2. rebuild

```bash
npm run build
```

### 3. prune extant daemon

```bash
npx rhachet keyrack daemon prune --owner ehmpath
```

**important**: use `npx rhachet`, not `rhx`. `rhx` may use global code.

### 4. test with local code

```bash
npx rhachet keyrack unlock --owner ehmpath --env test
npx rhachet keyrack status --owner ehmpath
```

a new daemon spawns from local `dist/` with your fix.

### 5. verify daemon uses local code

```bash
cat /proc/$NEW_PID/cmdline
```

confirm require path points to your worktree, not global pnpm.

## .common pitfalls

| pitfall | symptom | fix |
|---------|---------|-----|
| patch src but not rebuild | fix doesn't take effect | `npm run build` |
| use `rhx` instead of `npx rhachet` | may use global code | use `npx rhachet` |
| daemon still uses old code | fix doesn't take effect | prune daemon first |
| test global instead of local | fix works locally but not globally | check cmdline require path |

## .see also

- `spec.daemon-prune-behavior.md` — prune command specification
- `refs/poc.root-cause-investigation.md` — signed/unsigned mismatch details
