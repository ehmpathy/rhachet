# F9 — the focused role names its scope in one `<focus/>` line

## .the fork

a focused boot omits `<also>`, so the clone needs one line that names the subjects it was not
given (V1). the shape of that line:

- (a) `<focus given="101" elsewhere="code.prod,flow" always="kept|shed"/>`, first in the role's
  body, in the xml-tag form the body already uses
- (b) a prose sentence (`mechanic is booted at 101; also declares code.prod, flow`)
- (c) a `<also>` block that lists subject names in place of paths

## .taken — (a), and why at the time

the body is a run of xml-ish tags a clone already reads (`<readme>`, `<brief.say>`); one more tag
keeps one grammar. `always=` puts the shed (K1) where the clone reads its scope, beside the
receipt's line. (c) would reuse a tag whose children are paths, and overload it.

## .rework — clean

one transformer (`asRoleBootBody`) emits it, and one snapshot pins it. no reader parses it.

## .confidence — 70%, and why it is low

the vision asked for "one line", never a shape. a clone may read prose more readily than an
attribute list; that is untested.

## .where

`src/domain.operations/boot/asRoleBootBody.ts` · `getOneRoleBootContent.ts`

## .verdict

open.
