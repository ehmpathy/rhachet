# F1 · the spawn boot is content-addressed once per actor; a clone keeps only a reference

## .the fork

- **a.** the draft: each clone dir holds `boot/boot.spawned.md` (a full copy of the actor's `boot.md`)
  and `boot/CLAUDE.md` (its own delta)
- **b.** the actor dir holds `boots/sha256=<h>/{boot.md, CLAUDE.md}` once per boot revision a clone
  spawned on; the clone dir holds `boot.spawned.ref` (the hash)

## .taken = b, why

- `rule.forbid.per-clone-config` names "a frozen snapshot of an actor's config held inside a clone" a
  blocker. the boot bytes derive from `{ brain, roles }`; the fact of WHICH revision this run spawned on
  derives from the run. (b) puts each where the rule's test sends it
- the repo actor's `boot.md` is 441,263 chars (`wc -c`, 2026-11-17). (a) writes that per clone; (b)
  per revision
- the delta derives from `(spawn bytes, current bytes)`, both actor-owned: (b) renders it once per
  revision and every clone on it reads the same file, which is the sync invariant
- (b)'s dir is findserted before the spawn, so `--add-dir` names a dir that exists at launch. (a)
  stages into `.serial=….tmp` while the argv names the final dir, a launch race
- the ref is what lets a wake keep its first spawn's baseline (case=4)

## .rework = clean

a path choice inside two new operations; no caller is hardened against it yet (the draft is
uncommitted).

## .confidence = 85%, why not higher

the wish's outcome line places the boot "beside the clone record". (b) keeps a reference there, not
the bytes. the wisher may prefer the literal form.

## .where

`1.vision.yield.md` § the shape · § pushback footnote

## .verdict

reversed by the commander, review on ehmpathy/rhachet#770, 2026-11-23: scope the spawn boot per clone.
each clone holds `<actor>/boots/serial=<serial>/` with its spawn `boot.md`, a `boot.meta.json` that
names the spawn hash and the boot hash its drift was computed against, and the drift `CLAUDE.md`. the
drift is cached per current boot hash, and `delClone` reaps the spawn boot, so no separate revision
reap remains. F18, F20, F26 and F29 lapse with the revision model.
