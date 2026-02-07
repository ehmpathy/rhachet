# eval: env vars as the industry's secret distribution floor

> why does the whole ecosystem still depend on env vars? is there not a better recommended solution?

---

## the question

given that `/proc/$PID/environ` is readable by any same-UID process (empirically confirmed, ptrace_scope=1 does not block it) — why does the entire industry still use env vars to distribute secrets?

---

## the answer: env vars are the TCP/IP of secrets

env vars persist because they are the **one interface every tool, sdk, and ci system agrees on**.

```
env.var.trap
├─ every sdk expects env vars (aws, github, stripe, openai, etc)
│  └─ they expose alternatives but default to env var consumption
│
├─ every ci system injects via env vars (github actions, circleci, etc)
│  └─ it's the universal interface between "secrets store" and "process"
│
├─ every tool expects env vars (terraform, docker, npm, etc)
│  └─ the twelve-factor app (2011) enshrined this as the contract
│
├─ no universal alternative exists
│  ├─ mounted volumes → only in k8s/containers
│  ├─ process credentials → aws-specific
│  ├─ memfd_secret → no language adoption
│  ├─ unix domain sockets → no standard protocol
│  └─ kernel key retention → linux-only, no sdk integration
│
└─ result: everyone knows env vars are insecure
   └─ everyone uses them anyway
      └─ because they're the one contract all tools share
```

---

## the root cause: twelve-factor app (2011)

the [twelve-factor app methodology](https://12factor.net/config) canonized env vars as THE way to pass config:
- language and os agnostic
- can't accidentally commit to git (unlike config files)
- easy to change between deploys

but the methodology does not distinguish config from secrets. it treats all config as equivalent.

> "environment variables are exposed via the /proc filesystem. any process on the system can read those"
> — [twelve-factor config criticism](https://gist.github.com/telent/9742059)

> "if the environment variables are accessible by other users and processes, i.e. via export in linux, you are likely to do more harm than good"
> — [the good and the gotchas of twelve-factor app](https://guhaniyer.medium.com/the-good-and-the-gotchas-of-the-twelve-factor-app-dc473515d6f9)

env vars became the lowest common denominator. the entire ecosystem built on top of it. now it's load-bear.

---

## alternatives that exist today

### 1. secrets managers (vault, aws secrets manager, infisical, doppler)

the current industry answer: fetch secrets at runtime from a secrets manager. the tool fetches the secret, uses it, discards it.

> "secrets are injected into applications at runtime rather than stored as static files, to reduce the window of exposure"
> — [Infisical: secrets management best practices](https://infisical.com/blog/secrets-management-best-practices)

**the catch**: the tool itself still needs to hand the secret to the application. and most applications only accept secrets via... env vars. the circle completes.

```
secrets.manager.last.mile
├─ vault stores secret (encrypted, access-controlled, audited)
├─ tool fetches secret at runtime (authenticated, short-lived token)
├─ tool needs to pass secret to application
│  ├─ option A: env var → /proc readable → back to square one
│  ├─ option B: mounted file → works in k8s, not on dev machines
│  └─ option C: sdk integration → app-specific, not universal
└─ most tools choose option A because it's the only universal interface
```

### 2. mounted volumes (kubernetes pattern)

kubernetes explicitly recommends mounted volumes over env vars:

> "injection of a Secret as an environment variable makes the value available to all contents of the Pod... there is risk of the value exposed via logs or other processes"
> — [kubernetes secrets docs](https://kubernetes.io/docs/concepts/configuration/secret/)

> "injection of a Secret by means of a file in a volume can be more secure in the scope of the Pod, since you can make the file only selectively available to components within a container"

the secret is mounted as a tmpfs file with strict permissions. only the specific process that needs it can read it.

**the catch**: only works in container orchestration. doesn't help on dev machines where humans and robots run tools directly.

### 3. process credential providers (aws pattern)

aws sdk supports a [credential provider chain](https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html) that avoids env vars:

| provider | mechanism | env var? |
|----------|-----------|----------|
| instance role (IMDS) | http call to metadata service | no |
| container credentials (ECS) | http call to task endpoint | no |
| web identity token (EKS) | file-based token exchange | no |
| [process credentials](https://docs.aws.amazon.com/sdkref/latest/guide/feature-process-credentials.html) | spawn external process, read stdout | no |
| sso credentials | cached session token in `~/.aws/` | no |
| env vars | `AWS_ACCESS_KEY_ID` etc | yes |

env vars are the **fallback**, not the recommended path.

**the catch**: aws-specific. every other sdk (github, stripe, openai) still defaults to env vars.

### 4. memfd_secret() (kernel-level, linux 5.14+)

the most notable primitive: [memfd_secret()](https://man7.org/linux/man-pages/man2/memfd_secret.2.html) creates memory regions that are:

> "inaccessible to anybody else — kernel included"
> — [LWN: secrets in memfd areas](https://lwn.net/Articles/812325/)

the memory is removed from kernel page tables, can't be swapped, can't be read via /proc, can't be read via ptrace. it is the first real answer to the `/proc/$PID/environ` problem.

```
memfd_secret.properties
├─ removed from kernel page tables (kernel can't read it)
├─ removed from /proc (no process can enumerate it)
├─ locked in memory (can't be swapped to disk)
├─ can't be passed to system calls (no kernel access)
└─ file descriptor scoped (dies with the process)
```

**the catch**: almost zero adoption. no sdk uses it. no tool integrates it. available since linux 5.14 (2021) and remains a curiosity. [before linux 6.5, disabled by default](https://man.archlinux.org/man/memfd_secret.2.en). no language runtime exposes it natively.

---

## comparison: secret surface at each stage

| approach | at rest | in transit | at use (tool env) |
|----------|---------|------------|-------------------|
| raw env var | n/a | n/a | /proc readable |
| .env file | plaintext on disk | n/a | /proc readable |
| secrets manager | encrypted | encrypted | /proc readable (after injection) |
| k8s volume mount | tmpfs, permissions | n/a | file readable by container |
| **keyrack daemon** | in-memory only | unix socket | /proc readable (at `get` time) |
| memfd_secret | n/a | n/a | invisible to /proc and kernel |

every approach except memfd_secret shares the same last-mile problem: the secret must eventually exist in the tool's process, and `/proc/$PID/environ` exposes it.

---

## what this means for keyrack

### the daemon is ahead of the curve

most dev tools either:
- store secrets in .env files (plaintext on disk)
- use a secrets manager but inject via env vars (encrypted at rest, plaintext at use)

keyrack's daemon eliminates the disk surface and the session key surface. this is better than what most tools offer on dev machines.

### the irreducible floor is shared

the last mile — tool reads secret, secret exists in tool's env — is the irreducible floor that the **entire industry** shares. keyrack is not uniquely vulnerable here. every tool that distributes secrets via env vars (which is all of them) has this floor.

### the only escape is memfd_secret

the only mechanism that could eliminate the /proc side channel is `memfd_secret()`. but it requires:
1. language runtimes to expose the syscall
2. sdks to accept secrets from memfd instead of env vars
3. tools to pass secrets via file descriptors instead of env vars

this is a multi-year ecosystem shift that no single tool can drive.

### keyrack's correct posture

```
keyrack.posture
├─ accept the env var floor (shared with the entire industry)
├─ minimize exposure above the floor
│  ├─ daemon memory (not disk) for session cache
│  ├─ per-login-session scope (enforced by kernel)
│  ├─ per-worksite isolation (convened for bonintent)
│  └─ ttl enforcement (real, not convention)
├─ monitor for memfd_secret ecosystem maturity
│  └─ when language runtimes adopt it, keyrack can too
└─ don't build theater above the floor
   └─ per-terminal-chain adds UX cost with zero security gain
      └─ because /proc bypasses it entirely (see eval doc)
```

---

## sources

- [twelve-factor app: config](https://12factor.net/config) — the origin of env var convention
- [twelve-factor config criticism](https://gist.github.com/telent/9742059) — /proc exposure argument
- [twelve-factor app gotchas](https://guhaniyer.medium.com/the-good-and-the-gotchas-of-the-twelve-factor-app-dc473515d6f9) — env var security gap
- [CyberArk: env vars don't hold secrets](https://developer.cyberark.com/blog/environment-variables-dont-keep-secrets-best-practices-for-plugging-application-credential-leaks/) — industry risk assessment
- [Security Boulevard: are env vars still safe in 2026?](https://securityboulevard.com/2025/12/are-environment-variables-still-safe-for-secrets-in-2026/) — current state
- [Trend Micro: hidden danger of env vars](https://www.trendmicro.com/en_us/research/22/h/analyzing-hidden-danger-of-environment-variables-for-keeping-secrets.html) — /proc enumeration risk
- [Infisical: secrets management best practices](https://infisical.com/blog/secrets-management-best-practices) — runtime injection
- [kubernetes secrets docs](https://kubernetes.io/docs/concepts/configuration/secret/) — volume mount recommendation
- [AWS credential provider chain](https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html) — env var alternatives
- [AWS process credential provider](https://docs.aws.amazon.com/sdkref/latest/guide/feature-process-credentials.html) — stdout-based credential fetch
- [memfd_secret(2)](https://man7.org/linux/man-pages/man2/memfd_secret.2.html) — kernel-level secret memory
- [LWN: secrets in memfd areas](https://lwn.net/Articles/812325/) — memfd_secret design rationale
- [Phoronix: linux 5.14 memfd_secret](https://www.phoronix.com/news/Linux-5.14-memfd_secret) — availability timeline
- [memfd_secret arch man page](https://man.archlinux.org/man/memfd_secret.2.en) — linux 6.5 default enablement
- empirical test: `test.proc-environ-access.sh` (confirmed /proc readable with ptrace_scope=1)
