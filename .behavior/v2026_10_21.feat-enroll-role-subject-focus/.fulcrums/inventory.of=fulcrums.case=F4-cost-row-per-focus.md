# F4 — `roles cost --all` adds one row per declared subject of each subject-mode spec

- **the fork:** (a) one row per distinct `role::subject` found across actor dirs; (b) one row per
  actor, its whole `boot.md` priced; (c) no new rows, only a `--subject` arm on the single-spec
  cost; (d) one row per declared subject of each subject-mode spec, priced at `always` + that
  subject (or that subject alone, where it opts out of `always`)
- **taken:** (d). the sweep is keyed by spec and reads no actor
  (`getAllRepoBootSpecCosts.ts:115-153`), so (a) adds a second input the report has never had.
  (d) extends the extant key: a focus is a spec at a selection. it also prices every focus a
  commander could choose before they enroll it, which is the moment the 65.1k figure misled.
  (b) answers "what does this seat cost", a real question, but a different report. (c) fails
  requirement 4's "`--all`"
- **what (d) does not show:** a multi-subject focus (S2) is not a sum, since `always` counts once.
  it stays one `roles cost --subject a,b` away, and S2 is an alterpath
- **rework:** clean. a report refuses naught, so no caller hardens against its rows
- **confidence:** 65%. "count the subject" reads naturally as (d), but the wisher may have meant
  the seats enrolled today, which is (a)
- **where:** `1.vision.yield.md` .the contract · `case=5` · inventory R1
- **verdict:** —
