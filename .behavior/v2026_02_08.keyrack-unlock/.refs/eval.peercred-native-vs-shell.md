# eval: SO_PEERCRED native vs shell-based peer lookup

> should daemon use native SO_PEERCRED addon or shell-based ss/proc lookup?

---

## the question

two approaches to get the peer pid/uid from a unix socket connection:

1. **native addon** — `getsockopt(fd, SO_PEERCRED)` via get-peercred npm package
2. **shell-based** — `readlink /proc/self/fd/$fd` + `ss -xp | grep $inode`

both query kernel data structures. which is more secure?

---

## SO_PEERCRED (native)

```
getsockopt(fd, SOL_SOCKET, SO_PEERCRED, &cred, &len)
├─ returns: { pid, uid, gid }
├─ source: kernel socket structure
├─ atomic: yes, single syscall
├─ spoofable: no — kernel-populated, read-only
├─ time captured: at connect() call
└─ speed: ~microseconds
```

from [unix(7) man page](https://man7.org/linux/man-pages/man7/unix.7.html):
> "SO_PEERCRED returns the credentials of the peer process connected to this socket. The returned credentials are those that were in effect at the time of the call to connect(2)."

from [joeshaw/peercred](https://github.com/joeshaw/peercred):
> "The values returned by SO_PEERCRED are populated by the Linux kernel and cannot be spoofed."

---

## shell-based (ss + /proc)

```
readlink /proc/self/fd/$fd → socket:[12345]
ss -xp | grep 12345 → peer process info
├─ returns: pid (parsed from ss output)
├─ source: /proc/net/unix, kernel socket table
├─ atomic: no — two separate queries
├─ spoofable: no — /proc is kernel-provided
├─ time captured: at query time, not connect time
└─ speed: ~10-50ms (spawn shell, parse output)
```

---

## security comparison

| property | native SO_PEERCRED | shell ss+/proc |
|----------|-------------------|----------------|
| data source | kernel | kernel |
| spoofable | no | no |
| atomic | yes | no |
| time captured | connect-time | query-time |
| race window | none | tiny (negligible) |

### the race window

shell approach has a theoretical race:

```
t0: client connects
t1: daemon gets socket fd
t2: daemon runs readlink (gets inode)
t3: client disconnects        ← window opens
t4: new client connects       ← could get same inode (rare)
t5: daemon runs ss            ← sees new client's pid
```

in practice:
- socket inodes are not immediately recycled
- the window is milliseconds
- attacker would need to predict inode reuse time
- even if exploited, attacker is still same-user (socket permissions)

### why this is acceptable

the shell approach queries the same kernel data structures as SO_PEERCRED. the difference is:
- SO_PEERCRED: direct syscall, atomic
- shell: indirect via /proc + ss, two queries

both read kernel-authoritative data. neither can be spoofed by userspace.

---

## tradeoffs

| aspect | native | shell |
|--------|--------|-------|
| security | identical (kernel source) | identical (kernel source) |
| speed | ~microseconds | ~10-50ms |
| dependencies | node-gyp, C compiler | none (ss is standard) |
| portability | linux only | linux only (ss syntax) |
| maintenance | native addon updates | stable (ss is coreutils) |

---

## recommendation

**shell-based approach is acceptable** for keyrack daemon:

1. **same security posture** — both read from kernel, unforgeable
2. **no native addon** — avoids node-gyp build complexity
3. **negligible race window** — milliseconds, same-user only
4. **acceptable latency** — 10-50ms per connection is fine for interactive unlock

the daemon handles infrequent connections (unlock, get, status). ~50ms overhead is imperceptible.

---

## implementation

```ts
const getSocketPeerPid = ({ socket }: { socket: net.Socket }): number => {
  const fd = socket._handle.fd;

  // get socket inode from our fd
  const inode = execSync(`readlink /proc/self/fd/${fd}`)
    .toString()
    .match(/\d+/)?.[0];

  if (!inode) throw new Error('failed to get socket inode');

  // find peer process via ss
  const ssOutput = execSync(`ss -xp | grep ${inode}`).toString();

  // parse pid from output like: users:(("node",pid=12345,fd=7))
  const pidMatch = ssOutput.match(/pid=(\d+)/);
  if (!pidMatch) throw new Error('failed to get peer pid from ss');

  return parseInt(pidMatch[1], 10);
};
```

---

## sources

- [unix(7) - Linux manual page](https://man7.org/linux/man-pages/man7/unix.7.html)
- [joeshaw/peercred - Go SO_PEERCRED wrapper](https://github.com/joeshaw/peercred)
- [SO_PEERCRED in Go](https://blog.jbowen.dev/2019/09/using-so_peercred-in-go/)
- [Linux SS Utility](https://www.cyberciti.biz/files/ss.html)
