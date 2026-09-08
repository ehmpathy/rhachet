# seed S1 — ubuntu is the platform bound

## .said — verbatim, 2026-08-27

> we only care at ubuntu.

## .settled

**the platform matrix this wish must satisfy is ubuntu, which is glibc on x64 and arm64. musl
(alpine) is out of scope.**

that bound is what makes the cure tractable. upstream ships glibc prebuilds for both ubuntu
architectures and **no** musl prebuild at all, so a scope that included alpine would have forced
either a self-built binary or a permanent degraded row.

⚠️ **out of scope does NOT mean unhandled — it means handled LOUDLY.** an alpine host may install
the glibc binary (the platform gate reads `os`, and there is no `libc` gate), then fail at
`dlopen`. that failure is caught by `isPtyAddonLoadError`, which matches `ERR_DLOPEN_FAILED`,
returns null, and raises the report rather than swallows it.

⇒ a later host failure is an acceptable outcome for a platform we declined to support. a silent
one would not be, and is not what happens.

## .landed

- `1.vision.yield.md` — answer A9, and `### the platform matrix`
- `src/domain.operations/clone/pty/getPtyPlatformSupport.ts`
- `src/domain.operations/clone/asCloneSocketOmissionReasonError.ts` — the class split rests on this bound
