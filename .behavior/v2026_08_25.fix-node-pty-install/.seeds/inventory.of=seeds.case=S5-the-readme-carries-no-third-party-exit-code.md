# seed S5 — the readme carries no third party's exit code

## .said — verbatim, 2026-09-02

> and drop this;
> \> note: on `pnpm >= 11`, a local `pnpm install` may exit 1 with `ERR_PNPM_IGNORED_BUILDS` for
> \> node-pty's gated build step. this is benign — node-pty ships prebuilt binaries, so the
> \> gated step is a no-op. run `pnpm approve-builds` to silence it, or ignore the exit code.

## .settled

**our readme documents our own contract, never a third party's exit code.**

the struck note described what `pnpm install` — someone else's command — prints on someone else's
version, in a case our own code never reaches. a readme that absorbs the behavior of every tool a
consumer might run beside ours has no natural bound, and each such line ages on a schedule we do
not control.

⚠️ **the boundary is ownership, not relevance.** the note was accurate and the friction is real.
what makes it not ours is that no command we ship produces it: `pnpm add -g rhachet` exits 0 at
both majors, and `rhx upgrade` classifies the gate as `build-gate-blocked` and absolves it. the
one exit-1 cell belongs to a command we do not own.

⇒ where the friction reaches OUR surface, it is handled in code and clamped. where it does not,
the readme stays silent.

## .landed

- `readme.md`
