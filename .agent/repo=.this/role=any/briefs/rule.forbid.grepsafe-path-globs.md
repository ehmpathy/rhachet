# rule.forbid.grepsafe-path-globs

## .what

`rhx grepsafe --glob` **silently returns `matches: 0`** when the glob carries a path, rather
than a bare extension pattern. it does not warn, does not refuse, does not exit non-zero — it
reports a clean zero that reads exactly like "no matches found".

never trust a `matches: 0` from a glob that names a directory.

## .the evidence

one string, three globs, same repo, same moment:

| invocation | result |
|------------|--------|
| `--pattern 'setMockPromptValues'` (no glob) | **630 lines** |
| `--pattern 'setMockPromptValues' --glob '*.ts'` | matches, incl. nested `src/…` paths |
| `--pattern 'setMockPromptValues' --glob 'src/**/*.integration.test.ts'` | **`matches: 0`** ❌ |
| `--pattern 'setMockPromptValues' --glob 'src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts'` | **`matches: 0`** ❌ |

the string sits on line 9 of that last file. it was read with the Read tool moments before.

## .why it is dangerous

this is `rule.forbid.failhide` in tool form: **absence of output taken for absence of
findings.** a zero from a broken filter and a zero from a true miss are byte-identical, so
the reader draws a confident conclusion from a search that never ran.

it bit twice in one session:

- `--glob '.behavior/**/*.md'` → `0` → concluded *"no factory log exists in this tree"*.
  false; the term is throughout the route grammar.
- `--glob 'src/…/fillKeyrackKeys.integration.test.ts'` → `0` → concluded *"the integration
  test does not mock its prompts, so `fill` needs a pty harness"*. false; the prompts **are**
  mocked at that grain, and the pty was never needed.

the second nearly sent a whole test strategy down the wrong path.

## .how

```bash
# 👍 extension-style glob — filters correctly, still reaches nested dirs
rhx grepsafe --pattern 'setMockPromptValues' --glob '*.ts'

# 👍 no glob at all, then narrow by eye — slower, but never lies
rhx grepsafe --pattern 'setMockPromptValues'

# 👎 a glob that names a directory — silent zero
rhx grepsafe --pattern 'setMockPromptValues' --glob 'src/**/*.test.ts'
rhx grepsafe --pattern 'x' --glob 'src/domain.operations/foo.ts'
```

to scope to one file, use the **Read** tool or `--glob '*.<ext>'` and scan the paths in the
result. do not encode the directory into the glob.

## .the discipline this belongs to

a `0` that would **settle a question** is the exact moment to distrust it. probe the tool
with a string you have already seen with your own eyes; if that comes back `0` too, the
search is broken, not the codebase.

- never pair a search with `2>/dev/null` — a refusal then reads as a clean zero
- never scope a search outside the repo; grepsafe refuses out-of-repo paths, and the
  refusal is the signal you need to see

## .enforcement

- a conclusion drawn from a directory-glob `matches: 0` = **blocker**
- a search piped through `2>/dev/null` = **blocker** (failhide by redirect)

## .see also

- `rule.forbid.failhide` (code.prod + code.test) — the failure class this is an instance of
- `rule.require.trust-but-verify` — probe the tool before you trust its silence
