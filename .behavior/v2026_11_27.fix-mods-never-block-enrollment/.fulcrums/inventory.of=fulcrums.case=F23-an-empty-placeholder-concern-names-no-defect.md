# F23 — an empty placeholder concern names no defect, so it is disputed, not conceded

- **fork**: 5.3 peer `repo-rules` (r1, round i001) reported `blocker.1: placeholder` with `**rule**: placeholder`, no location, and an empty snippet.
  - The options:
    - (a) concede it, and change code to satisfy a concern that names no rule, file, or line
    - (b) dispute it as a reviewer misfire, and let the next round of the lane run against the current diff
- **taken**: (b).
  - A concession promises a fix, and there is no defect named to fix. A code change made to quiet it would be a workaround with no cause (`rule.forbid.workarounds`).
  - The lane's report holds only the template body, so the brain emitted the frame and no concern.
  - The next arrival re-runs the lane on the same rules, so a real defect it missed will surface there with a rule and a location.
- **rework**: clean. If the re-run names a real defect, it is answered on its own merits; this dispute rules on the empty item alone.
- **confidence**: 90%. Below the bar only because the brain's intent cannot be read from an empty report.
- **where**: `.behavior/v2026_11_27.fix-mods-never-block-enrollment/.reviews/peer/5.3.verification._.review.i001.b067b0046beb176617.r001._.given.by_peer.repo-rules.report.md`
- **raised by**: 5.3 peer review r1, blocker.1
