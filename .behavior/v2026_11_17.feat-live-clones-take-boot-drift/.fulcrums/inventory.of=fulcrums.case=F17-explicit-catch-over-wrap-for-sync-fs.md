# F17 · the boot drift file operations keep an explicit catch, not `MalfunctionError.wrap`

## .the fork

- **a.** an explicit `try`/`catch` that throws a `MalfunctionError` with the path and the cause
- **b.** `MalfunctionError.wrap(() => readFileSync(...), { message, metadata: { path } })()`, per
  `rule.prefer.helpful-error-wrap`

## .taken = a

b was tried. measured on 2026-11-18 with helpful-errors 1.7.5: under b, a read of an absent revision
threw the raw `ENOENT` past the wrap (`HelpfulError.ts:376`), with no `MalfunctionError` and no
`path`. seven integration cases went red: the gone-revision and unreadable-latch faults lost their
class and path, and the init reach lost the ref path in its fault reason. these reads exist to name
the path a human must look at (vision case=21), so a wrap that drops it defeats them. each file now
says why in a `.note`.

## .rework = clean

swap two catch blocks for the wrap, once helpful-errors wraps a sync throw.

## .confidence = 90%, why

measured, red then green on revert; the doubt is only whether a newer helpful-errors fixes wrap.

## .where

`src/domain.operations/boot/getOneBootDriftFileContent.ts`,
`src/domain.operations/clone/setCloneBootDriftTold.ts`. answers r2.nitpick.1 (round 2).

## .verdict

owed — a council rules at the close.
