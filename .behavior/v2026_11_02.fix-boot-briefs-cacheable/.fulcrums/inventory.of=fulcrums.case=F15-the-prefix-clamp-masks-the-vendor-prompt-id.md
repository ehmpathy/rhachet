# F15 — the prefix clamp masks the vendor's per-request prompt id

## .the fork

the journey's M2 clamp asserts two sessions send byte-equal `system` blocks. claude 2.1.292 (the version
the journey installs) stamps `cc_prompt_id=<uuid>` into its attribution header, system block [0], ahead
of the boot, new per request. the clamp went red at offset 123 on it. claude 2.1.280 (the ambient cli)
sends no such field, and a new session reads the boot from cache (`rhx boot.cache.probe --diff`,
2026-11-04: 132,295 read, 4,806 write).

- **A** — mask that one value in M2; the live cache-read assert in the same journey judges whether the
  block costs cache
- **B** — leave M2 strict and red until a funded key measures 2.1.292
- **C** — pin the journey's claude to 2.1.280

## .taken

A. the boot is blocks [2] and [3], which the render owns and the clamp still holds byte for byte; the
vendor's attribution block is outside the render's reach, and a strict red on it says naught about the
boot. the mask names only `cc_prompt_id`, so any other value that enters ahead of the boot still reddens.
the cost question stays open and is owed to the live assert (line 615), red today on the test key's
balance. C would hide the vendor change the journey exists to see.

## .rework

clean: one regex in one test.

## .confidence — 95%

measured 2026-11-04, the journey on claude 2.1.292 (the prompt id present): the second session read
5,761 tokens from cache and wrote 379, for a ~4,900-token boot (`M2 measure`, the live cache-read assert,
green). the id sits outside the cache key.

## .where

- `blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` — M2, `asPromptIdMasked`

## .verdict

settled by measure
