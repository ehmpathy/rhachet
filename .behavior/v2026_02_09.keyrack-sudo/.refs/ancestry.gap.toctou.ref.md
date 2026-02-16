# ref: ancestry gap — exec() TOCTOU

## .what

analysis of the theoretical exec() TOCTOU gap in ancestry-based session scope — and why it's not a real concern.

---

## .the theoretical gap

ancestry is verified at **check time**. process identity can change at **use time**.

```
check time: daemon verifies caller is descendant of originator
use time:   daemon sends credential to caller

the process could exec() between these two moments.
```

---

## .why this gap is not real

for this attack to work, you'd need a tool that:
1. connects to keyrack daemon
2. sends a credential request
3. exec()'s to something else **before reading the response**
4. leaves the response for the exec'd program to read

**no legitimate tool would do this.** the normal flow is:
```
connect → request → read response → use credential
```

by the time any tool would exec() to use the credential, it already has the credential in memory. no TOCTOU needed.

**if the tool is malicious**: it doesn't need the exec() trick. it can just read the credential directly.

**if the tool is legitimate**: it would read the response before doing anything else. that's just how request/response works.

the only scenario where this matters is a tool **specifically designed** to exploit this gap — which makes it malware, not a "legitimate tool that exec()'s at the wrong time."

---

## .for completeness: how exec() works

when a process calls `exec()`:

| property | preserved? | implication |
|----------|------------|-------------|
| PID | ✓ yes | same process identity to kernel |
| PPID | ✓ yes | same ancestry chain |
| open file descriptors | ✓ yes* | socket connection survives |
| process image (code) | ✗ no | completely replaced |

*unless fd has `O_CLOEXEC` flag set

**key insight**: exec() replaces WHAT the process is (code), but not WHO it is (PID, ancestry, open connections).

---

## .demo: the contrived attack

this is a theoretical demonstration. as noted above, no real tool would behave this way.

### setup

```
terminal (PID 1000, originator)
  └── bash (PID 1001)
        └── contrived-tool (PID 1002)
```

`contrived-tool` is a hypothetical program that:
1. connects to keyrack daemon
2. requests a credential
3. exec()'s to another program **before reading the response** (nonsensical design)

### timeline

```
t=0   legitimate-tool connects to daemon socket
      └── socket fd = 5

t=1   legitimate-tool sends: GET { slug: "prod.AWS_SECRET" }

t=2   daemon receives request
      └── SO_PEERCRED returns PID 1002
      └── daemon walks /proc: 1002 → 1001 → 1000 ✓
      └── ancestry check PASSES

t=3   daemon prepares response with credential

t=4   legitimate-tool exec()'s to malware
      └── PID still 1002
      └── socket fd 5 still open (no O_CLOEXEC)
      └── process image now malware

t=5   daemon sends credential on socket

t=6   malware receives credential
      └── credential stolen ✗
```

### the code

```c
// contrived-tool.c — NO REAL TOOL WOULD DO THIS

int main(int argc, char **argv) {
    // connect to keyrack daemon
    int sock = socket(AF_UNIX, SOCK_STREAM, 0);
    connect(sock, &keyrack_addr, sizeof(keyrack_addr));

    // request credential
    write(sock, "GET prod.AWS_SECRET", 19);

    // THIS IS THE NONSENSICAL PART:
    // exec BEFORE reading the response
    // no legitimate tool would do this
    execvp(argv[1], &argv[1]);

    // a real tool would instead:
    // read(sock, buf, sizeof(buf));  // get the credential
    // use_credential(buf);            // use it
    // then maybe exec() to something
}
```

```c
// malware.c — receives credential on inherited socket

int main() {
    // socket fd was inherited from legitimate-tool
    // attacker knows fd number (or scans /proc/self/fd)
    int sock = 5;  // or discovered via /proc/self/fd

    // read the credential that daemon sends
    char buf[4096];
    read(sock, buf, sizeof(buf));

    // credential stolen
    printf("stolen: %s\n", buf);
    exfiltrate(buf);
}
```

### invocation

```bash
# user runs legitimate-tool, which exec's to user-specified program
# user doesn't realize the program is malicious
$ legitimate-tool ./innocent-looking-binary

# or via a more realistic vector:
$ xargs-like-tool ./process-each < items.txt
# where process-each is malicious and inherits the socket
```

---

## .why this is hard to exploit

### window is microseconds

the window between ancestry check (t=2) and credential delivery (t=5) is microseconds:

```
t=2: ancestry check      ─┐
t=3: prepare response     │ ~100μs typical
t=5: send credential     ─┘
```

the exec() must happen in this window. this requires:
- the legitimate tool to exec() at exactly the right moment
- or the legitimate tool to exec() before read of response (leave response in kernel buffer)

### socket fd discovery

the malware must know which fd is the keyrack socket:
- could scan `/proc/self/fd` to find unix sockets
- could check socket peer address
- not impossible, but adds complexity

### O_CLOEXEC defense

if the socket is created with `O_CLOEXEC`:

```c
int sock = socket(AF_UNIX, SOCK_STREAM | SOCK_CLOEXEC, 0);
```

then exec() automatically closes it. malware receives no credential.

**keyrack should use O_CLOEXEC on all sockets.**

---

## .why proposed "attack vectors" don't work

### vector 1: malicious tool in PATH — NOT TOCTOU

```bash
eval $(rhx keyrack get AWS_PROFILE)
aws s3 ls  # even if malicious, this is NOT the TOCTOU attack
```

this is **not** the TOCTOU attack. the keyrack client reads the response, outputs it, and exits. the `aws` command runs separately — it doesn't inherit the keyrack socket.

if `aws` is malicious, it could read the credential from the environment variable. but that's a different attack (credential exposure via env), not TOCTOU.

### vector 2: tool that exec()'s with open socket — DOESN'T EXIST

```bash
# a tool that:
# 1. connects to keyrack
# 2. exec()'s to user-specified command BEFORE reading response
# this tool doesn't exist because no one would design it this way
```

### vector 3: LD_PRELOAD — REQUIRES PRIOR COMPROMISE

```bash
# attacker sets LD_PRELOAD to hook exec()
# but: if attacker can set LD_PRELOAD, they already have code execution
# they don't need the TOCTOU attack
```

---

## .why this is NOT the main concern

the exec() TOCTOU requires:

1. **a legitimate tool that exec()'s at the wrong time** — rare
2. **socket without O_CLOEXEC** — fixable
3. **malware that knows to read from inherited fd** — specialized

compare to the **same-ancestry supply chain attack**:

1. **npm postinstall runs as legitimate descendant** — common
2. **no special timing required** — just connect and request
3. **any malware works** — no socket inheritance needed

the supply chain attack is far more practical. the TOCTOU is a theoretical edge case.

---

## .mitigation

### O_CLOEXEC on all sockets

```typescript
// daemon should create socket with CLOEXEC
const server = net.createServer();
// node.js doesn't expose SOCK_CLOEXEC directly
// but child processes don't inherit the server socket anyway

// client socket — ensure CLOEXEC
const client = net.connect(socketPath);
// node.js sets CLOEXEC by default on most platforms
```

### verify ancestry at response time (defense in depth)

```typescript
const handleGet = async (socket, request) => {
  const callerPid = getSocketPeerPid(socket);

  // check 1: at request receipt
  if (!isDescendantOf(callerPid, session.originatorPid)) {
    return { error: 'not in session' };
  }

  const credential = await fetchCredential(request.slug);

  // check 2: at response send (defense in depth)
  // re-verify the socket peer is still the same process
  const currentPid = getSocketPeerPid(socket);
  if (currentPid !== callerPid) {
    return { error: 'process changed during request' };
  }

  // note: this doesn't fully prevent TOCTOU because exec()
  // preserves PID. but it catches process replacement via
  // other mechanisms.

  return { credential };
};
```

### short-lived connections

```typescript
// client: connect, request, read response, disconnect
// don't leave socket open for longer than needed

const getCredential = async (slug: string) => {
  const socket = await connect(SOCKET_PATH);
  try {
    await write(socket, { cmd: 'GET', slug });
    const response = await read(socket);
    return response.credential;
  } finally {
    socket.destroy();  // close immediately after use
  }
};
```

---

## .comparison to other TOCTOU

| TOCTOU type | window | exploitability |
|-------------|--------|----------------|
| file access (open then read) | milliseconds | medium |
| symlink race | milliseconds | medium |
| **exec() during socket response** | **microseconds** | **low** |
| PID reuse | seconds to minutes | blocked by pidfd |

the exec() TOCTOU has an unusually small window because:
- network/IPC is fast (microseconds)
- exec() is slow (milliseconds to load new image)
- time the exec() to land in the window is difficult

---

## .summary

| aspect | assessment |
|--------|------------|
| is it theoretically possible? | yes — kernel allows exec() with open sockets |
| would any real tool trigger it? | no — no tool would exec() before read of response |
| is it a practical concern? | no — requires a tool specifically designed to exploit it |
| should we mitigate anyway? | O_CLOEXEC is good hygiene, but not for this reason |

**the exec() TOCTOU is not a real attack vector.**

for this attack to work, you need a tool that sends a request and then exec()'s before read of the response. no legitimate tool does this. a malicious tool could do it, but then it could also just read the credential directly — the exec() adds no value.

**the real risk** is same-ancestry supply chain attacks (npm postinstall, pip setup.py) where malicious code runs as a legitimate descendant from the start. these don't need any TOCTOU — they just connect and request credentials like any other descendant.

---

## .sources

- [exec(3) — Linux manual](https://man7.org/linux/man-pages/man3/exec.3.html)
- [O_CLOEXEC — close-on-exec flag](https://man7.org/linux/man-pages/man2/open.2.html)
- [TOCTOU race conditions](https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use)

