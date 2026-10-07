# rule.always.resnap-the-help-a-skill-renders

> **a skill's `show_help()` IS its `help` output. so an edit to its text is an edit to a
> snapshotted contract, and it owes a resnap in the SAME edit.**

this repo's `.sh` skills render `help` from a `show_help()` function, and the acceptance tier
snapshots that output. ⇒ the help text and the contract are one artifact under two names.

🟡 the `######` header docblock is NOT that artifact. a skill that renders `show_help()` does not
emit its header, and says so in it (`calc.tokens.sh`, `get.package.format.sh`). an edit to the
header moves no snapshot — which is why the header points at `show_help()` as the one source.

## .why — help text reads like documentation, so the edit does not FEEL like a contract change

every other snapshotted surface announces itself: a render function, a formatter, a cli handler.
help text announces the opposite — a heredoc of prose, edited the way a reader edits a readme.

| what a reader believes | what is true |
|---|---|
| help text is documentation | 🔴 it is the `help` **payload**, byte for byte |
| a doc edit is safe to ride along in any diff | it reddens an acceptance suite in a file the diff never opened |
| the tier will name the cause | it names a **snapshot diff**, and the author reads that as a render defect |

⇒ so the failure arrives late, in a suite the author did not touch, in the shape of a different
bug. that is the whole cost, and it is paid per occurrence.

## .the test

> **is this text emitted?** — yes → it is a contract. resnap in the same edit.

one read settles it: what does the skill print for `help`? a `show_help()` heredoc, or a
`sed`/`awk` over `$0` that cats the header? whichever it prints is snapshotted, and that is the
text whose edit owes a resnap.

| when… | then… |
|---|---|
| you edit a skill's `show_help()` — one word, one line, a whole block | 🔴 resnap its acceptance suite **before you leave the file** |
| a review repair asks you to **document** a behavior | the help is where it lands, so the repair is a two-file change |
| you add an `exits:` row, a flag, a `.note` to the help | each is a snapshot diff |
| a snapshot goes red in a suite your diff never named | 🔴 check for a help edit before you diagnose a render defect |
| you would defer the resnap to "the next full tier" | the tier costs ~an hour. the resnap costs ~40s, scoped |
| you edit the `######` header of a skill that renders `show_help()` | no resnap is owed — the header is not emitted |

## .the worked case — `calc.tokens`

`calc.tokens.acceptance` `[case6]` snapshots `rhx calc.tokens help`, which renders
`show_help()`. each of these help edits reddens `[case6]`, and neither touches a line of code:

| the help edit | what goes red |
|---|---|
| the help gains the `--format json` banner recipe | `[case6]` |
| the `exits:` block gains the glob/read race, and why it is a **constraint** rather than a malfunction | `[case6]` |

🔴 **an author who knows the rule still trips it**, because the edit reads as documentation, not as
a contract change. ⇒ the cure is mechanical — resnap before you leave the file — never recalled.

## .enforcement

- a help edit shipped with no resnap of its help snapshot = **blocker** (the tier is red, and the
  next reader inherits a failure whose stated cause points at the wrong file)
- a red help snapshot diagnosed as a render defect where a help edit explains it = **nitpick**

## .see also

- `rule.require.snapshot-verified-on-independent-run` — the peer, and the contrast: that rule
  governs a snapshot's volatile **content**; this one governs a **source artifact that is itself a
  snapshotted surface**
- `rule.require.skill-help.[guide]` (rhachet/enroller) — why every skill owes a help block at all
- `rule.require.contract-snapshot-exhaustiveness` (bhuild/behaver) — why the help is snapshotted
