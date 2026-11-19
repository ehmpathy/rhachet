# F17 — two settings writers, one producer of dispatcher entries

## .the fork

dispatcher entries reach settings two ways: `setHookDispatchersViaAdapter` (sync) and
`asSettingsWithHookDispatchers` (enroll derive). should one write both?

- **(a)** two writers, each over its own target, both built on `asHookDispatchersOfRules`
- **(b)** the pure transform alone writes both

## .taken

(a). the entries already come from one producer, `asHookDispatchersOfRules`. only the writes
differ, because the targets differ:

- the sync writes a brain's settings through that brain's own adapter (F5, ruled). the adapter
  owns the file's shape, and it is the only writer for any brain but claude
- the enroll derive builds a derived actor's json in memory, which core shapes itself

(b) would bypass the brain adapter that F5 kept in charge of its file.

## .rework

clean: a call of the pure transform from the sync, plus a direct json write. it reverses part of F5.

## .confidence

85%.

## .where

`src/domain.operations/brains/dispatch/setHookDispatchersViaAdapter.ts`,
`asSettingsWithHookDispatchers.ts`, `asHookDispatchersOfRules.ts`

## .verdict

open, for the director at the pr.
