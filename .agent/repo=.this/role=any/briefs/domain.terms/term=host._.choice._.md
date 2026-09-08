# domain.term: host

term.chosen   = host
term.kind     = noun
term.synonyms.forbidden:
- machine
- box
- runner
- device
- node

## .what

⚠️ **`host` carries TWO senses in this repo, and both are declared.** the ambiguity is real,
recorded rather than resolved, and it is the reason this cluster exists.

| sense | what it means | declared as |
|-------|---------------|-------------|
| **A — the machine** | the computer the process runs on: its platform, arch, libc | `asPtyHostTuple`, `getPtyHostTupleFromProcess`, `hostTuple`, `hostHash`, `hostPid` |
| **B — the terminal adapter** | the wires a pty clone mirrors through: stdout, input, size, signals | `PtyCloneHost`, `genPtyCloneHostFromProcess` |

sense **A** is *"the host this ran on."* sense **B** is *"the host that hosts the child"* — that
which **hosts** a guest process, in the way a server hosts a site.

## .why it is not yet split

both senses are idiomatic english for `host`, both carry load, and each already has a compound
that disambiguates it at the point of use:

```
hostTuple            reads as A, never B — a tuple is a machine fact
PtyCloneHost         reads as B, never A — a clone's host is its terminal
```

so the ambiguity sits **in the bare word alone**, and the bare word is used nowhere as a
contract. that is what keeps this an open ambiguity rather than a blocker today.

## .the hazard, stated so the next traveler does not have to find it

⚠️ **a bare `host` field, argument, or suffix is the drift.** the two senses live in the SAME
directory (`clone/pty/`), so a reader who meets `host: …` there has no local cue which one is
meant, and no type stops a wrong wire — sense A is a `string`, sense B is an interface.

the lived case: a `…ForHost` suffix was proposed for the ambient-read wrappers
(`isPtyPlatformSupportedForHost`) and **rejected twice over** — once because `For<Noun>` names
the noun as an *input* in all 15 extant uses, and once because `Host` there would read as sense B
while it meant sense A. it became `…FromProcess` instead (`getPtyPlatformSupportFromProcess`).

## .the rule this cluster asks of you

> **never use `host` bare in a contract.** always compound it so the sense is local:
> `hostTuple`, `hostPid`, `hostHash` for A · `PtyCloneHost` for B.

a bare `host` in a new contract is a drift to be renamed or disputed, never merged.

## .refs
- `src/domain.operations/clone/pty/asPtyHostTuple.ts`                    # sense A, the owner
- `src/domain.operations/clone/pty/getPtyHostTupleFromProcess.ts`        # sense A, the ambient read
- `src/domain.operations/clone/asCloneSocketOmissionReasonError.ts`            # sense A, `hostTuple`
- `src/domain.operations/clone/setCloneIdentity.ts`                      # sense A, `hostPid` / `hostHash`
- `src/domain.operations/clone/pty/genBrainCliPtyClone.ts`               # sense B, `PtyCloneHost`
- `src/domain.operations/clone/pty/genPtyCloneHostFromProcess.ts`        # sense B, the prod adapter

## .not a synonym of

- 👎 `machine` — narrower than sense A (drops the platform/libc facts a tuple carries) and
  meaningless for sense B
- 👎 `runner` — already names a ci executor in the workflow vocabulary; an overload on an overload
- 👎 `device` / `box` — informal, and neither reads as sense B

## .reason
see the ref-level cluster beside this choice:
- `term=host._.choice.reason.md` — etymology, the open ambiguity, evidence
