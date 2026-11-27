# F32 — the parser's line is shown verbatim, and the handoff names `defects` only when a defect exists

- **fork (a)**: mask the yaml library's message in snapshots, as `enroll.focus` case5 masks a v8 parse message; or lock it verbatim
- **taken (a)**: lock it verbatim
- **why (a)**: the yaml line is what a human reads to find the fault (`at line 12, column 10`). a snapshot exists to show that text; a mask would hide the very row the receipt is for. a v8 message differs per node version on one host, which is why case5 masks it; the yaml library is pinned in the lockfile, so its text moves only on a deliberate bump, and a snapshot diff on that bump is the review it should get
- **fork (b)**: emit `defects: []` on every `--output json` handoff, and each entry as `{ path, kind }`; or emit the key only when a defect exists, each entry `path (kind)`
- **taken (b)**: keep as is
- **why (b)**: the key appears only with content, so a clean birth's handoff reads as it did before this pr, byte for byte, and no extant consumer meets a new key. the entry form matches the stop refusal's `defects` key, so one reader parses both. `specsOver` holds bare paths because a budget breach has one kind
- **counter (5.3 i004 r11 nitpick.6, nitpick.8)**: a library bump moves ~6 snaps; the handoff shape is uneven across births
- **rework**: clean. a mask in `asSnapshotSafe`; a key default and an entry shape in the handoff, with its consumers in this repo only
- **confidence**: 70%
- **where**: 5.3 peer review i004 r11 nitpick.6, nitpick.8
- **verdict**: open
