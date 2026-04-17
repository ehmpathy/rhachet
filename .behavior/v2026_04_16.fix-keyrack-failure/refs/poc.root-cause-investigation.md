# root cause investigation

## the code path

`getSocketPeerPid.ts` does:

```
1. socket._handle.fd → file descriptor number
2. readlink /proc/self/fd/$fd → "socket:[INODE]"
3. ss -xp | grep INODE → find line with process info
4. parse pid=NNNN from output
```

## the failure

step 3 returns empty: `ss -xp | grep $inode` finds no match.

## hypothesis

`ss -xp` shows unix sockets with process ownership. but:

- the inode from `/proc/self/fd/$fd` is the daemon's endpoint of the connection
- `ss` may not list this inode, or may list it without process info
- `-p` flag may require CAP_NET_ADMIN to see other processes' sockets

## questions to answer

1. what does `ss -xp` actually output on this machine?
2. does the inode from the accepted connection appear in `ss` output?
3. is this a permission issue (needs root or CAP_NET_ADMIN)?
4. is there an alternative way to get peer PID (SO_PEERCRED)?

## alternative: SO_PEERCRED

the code comment says "node.js does not expose SO_PEERCRED directly". but:

- SO_PEERCRED is the correct way to get peer credentials on unix sockets
- could use a native addon or FFI to call getsockopt(SO_PEERCRED)
- this would be more reliable than parse of `ss` output

## next step

need to manually inspect `ss -xp` output to understand what it shows.

---

## ROOT CAUSE FOUND

### the bug: signed vs unsigned integer mismatch

the socket inode from `/proc/self/fd/$fd` is shown as **unsigned** (always positive).

`ss -xp` displays socket identifiers as **signed 32-bit integers** (can be negative when inode > 2^31).

when the inode is > 2147483647 (2^31), the representations differ:

| source | inode representation |
|--------|---------------------|
| `/proc/self/fd/$fd` | `socket:[2365553034]` (unsigned) |
| `ss -xp` output | `-1929414262` (signed) |

the grep for the unsigned number will never find the signed number.

### proof

from `ss -xp` output:

```
u_str ESTAB 0 0 * -1929414262 * -1929414261 users:(("firefox-bin",pid=58996,fd=258))
```

the `-1929414262` is a signed 32-bit representation. as unsigned: `4294967296 + (-1929414262) = 2365553034`.

the daemon's error showed inode `2367234854`. as signed 32-bit: `2367234854 - 4294967296 = -1927732442`.

the grep searches for `2367234854` but ss shows `-1927732442`. no match.

### why this is systemic

this is NOT a stale daemon issue. the signed/unsigned mismatch affects ANY socket with inode > 2^31 (about 50% of all sockets on a long-running system with high socket churn).

the longer the system runs, the higher the socket inode counter grows, the more likely this bug manifests.

### fix options

1. **convert to signed before grep**: compute `inode > 2^31 ? inode - 2^32 : inode` and grep for both
2. **use SO_PEERCRED**: node.js doesn't expose it directly, but a native addon or FFI could call `getsockopt(fd, SOL_SOCKET, SO_PEERCRED, &cred, &len)`
3. **use lsof instead of ss**: `lsof -p $pid` with the daemon's own PID to find connected sockets

option 2 (SO_PEERCRED) is the correct fix — it's what unix socket peer credential lookup is designed for. the `ss` approach was a workaround for node.js not exposing SO_PEERCRED.

---

## FIX PROVEN

### the patch

option 1 (convert to signed before grep) was implemented in `getSocketPeerPid.ts`:

```typescript
const inodeNum = parseInt(inode, 10);
const INT32_MAX = 2147483647; // 2^31 - 1
const UINT32_MAX = 4294967296; // 2^32
const signedInode =
  inodeNum > INT32_MAX ? inodeNum - UINT32_MAX : inodeNum;
const grepPattern =
  inodeNum > INT32_MAX ? `(${inode}|${signedInode})` : inode;

let ssOutput: string;
try {
  ssOutput = execSync(`ss -xp | grep -E "${grepPattern}" || true`, {
    encoding: 'utf-8',
    timeout: 5000,
  });
}
```

the patch greps for both the unsigned and signed representations when the inode exceeds 2^31.

### test steps

1. patch `src/.../getSocketPeerPid.ts`
2. rebuild: `npm run build`
3. prune extant daemon: `npx rhachet keyrack daemon prune --owner ehmpath`
4. test unlock: `npx rhachet keyrack unlock --owner ehmpath --env test`
5. test status: `npx rhachet keyrack status --owner ehmpath`

### result

```
$ npx rhachet keyrack unlock --owner ehmpath --env test
[keyrack-daemon] spawned background daemon (pid: 2684369)
🔓 keyrack unlock

$ npx rhachet keyrack status --owner ehmpath
🔐 keyrack status
   ├─ owner: ehmpath
   ├─ recipients:
   │  └─ default (age)
   └─ daemon: active ✨
      └─ (no keys unlocked)
```

**fix validated.** both unlock and status succeed after the patch.

### key insight

the daemon runs compiled code from `dist/`, not TypeScript from `src/`. a patch to source requires:
1. `npm run build` to compile
2. daemon prune to kill extant daemon
3. next command spawns fresh daemon with new code

see `howto.diagnose-daemon-errors.md` for the full diagnosis workflow.
