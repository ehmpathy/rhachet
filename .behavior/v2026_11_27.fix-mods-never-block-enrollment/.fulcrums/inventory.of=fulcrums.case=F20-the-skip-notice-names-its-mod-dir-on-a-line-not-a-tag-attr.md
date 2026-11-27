# F20 — the skip notice names its mod dir on a line, never as a tag attr

- **fork**: the vision's case=1 drew the notice tag as `<mod.skipped of="driver" mod=".agent/repo=.mods/role=driver/">`.
  - The 5.3 build shipped `<mod.skipped of="driver">` with no mod path anywhere in the notice.
  - A skipped mod boots no file, so the notice is the one place a reader learns where the paths its fault and fix name sit.
  - The options:
    - (a) the planned attr, `mod="…"` on the open tag
    - (b) a `mod = .agent/repo=.mods/role=<role>/` line under the lead line, beside the `fix =` line
- **taken**: (b).
  - The notice body already speaks in `key = value` lines (`fix =`), so a second key reads in the same shape.
  - The open tag stays `<mod.skipped of="<role>">`, the anchor every test and reader greps for, so no pin moves.
  - The fact the vision asked for, the mod dir in the notice, lands either way.
- **rework**: clean. Move the path from the line into the open tag, then resnap `asRoleModSkippedNoticeLines`, `asRoleBootBody`, and the mods blackbox suites.
- **confidence**: 85%. The vision drew the attr form verbatim, and a reader who holds the vision as the contract would take (a).
- **where**: `src/domain.operations/mods/asRoleModSkippedNoticeLines.ts`
- **raised by**: 5.3 self review `has-ergonomics-validated`
