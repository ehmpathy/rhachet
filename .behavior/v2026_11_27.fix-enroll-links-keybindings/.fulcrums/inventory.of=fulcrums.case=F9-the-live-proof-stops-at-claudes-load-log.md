# fulcrum F9: the live proof stops at claude's load log

## .the fork

the live suite (`enroll.keybindings.realbrain`) must show a real clone takes the human's keys.

- **A. the load log** — claude's `--debug-file` names the bindings it loaded and the path it read
- **B. the pane** — rebind submit (`ctrl+x ctrl+s` → `ctrl+enter`), read the clone's pane for the
  hint, then edit the home file and poll for a reload

## .taken: A

- this change owns one read: a clone's config dir holds an arrow to the home file. the load line
  proves claude read the bindings through that arrow, and the clamp bites (the layout op reverted,
  red)
- the hint glyph and the reload are claude's render and claude's watcher. a pane read pins a
  claude ui string that shifts by release, and a reload case pins its poll period; both flake on
  causes outside rhachet
- the suite asserts claude's watch line for the arrow path as a proxy, and says so

## .rework: clean

one more `then` in the extant suite, on the same isolated HOME.

## .confidence: 85%

the wish's symptom is the hint. a claude release that loads the bindings and renders a stale hint
would pass A.

## .where

`blackbox/cli/enroll.keybindings.realbrain.acceptance.test.ts`.

## .verdict

open — for the commander, with the pr.
