# self-review r2: has-questioned-assumptions (deeper pass)

## re-examine: what exactly was stored?

the wish shows:
```
"secret": "{"
```

jq outputs pretty-printed json:
```
{
  "appId": "3234162",
  "privateKey": "-----BEGIN RSA...
```

the first LINE is literally just `{` followed by a newline. if stdin reader uses `readline()`, it would return just `{`. this matches perfectly.

**holds**: the symptom aligns with "read first line only".

## question: where does keyrack code live?

**hidden assumption**: the bug is in THIS repo (rhachet).

**need to verify**: is keyrack implemented in rhachet, or in a different package?

**action**: before implementation, trace imports to confirm code location.

**impact on vision**: none — the vision is about WHAT to fix, not WHERE the code is. research phase will find the location.

## question: does keyrack set read from stdin at all?

**what we assume**: piped input goes to stdin, keyrack set reads it.

**evidence from wish**: user pipes json, expects it to be stored. the output shows SOMETHING was stored (`"{"`), so stdin IS read.

**what if opposite were true?**: if keyrack set ignored stdin, no content would be stored. but content WAS stored (the truncated `{`).

**holds**: keyrack set does read from stdin, but incorrectly.

## question: could this be argument parse, not stdin read?

**hypothesis**: maybe the shell or CLI framework truncates before reaching our code.

**evidence against this**:
- shell piping is well-tested, doesn't truncate
- the truncation is at newline, not at shell-special characters
- same command works with empty privateKey (no newlines)

**holds**: unlikely to be shell/CLI framework. most likely our stdin reader.

## question: is "backwards compatible" accurate?

**claim in vision**: "fix only affects write path"

**what if we're wrong?**: if we change how stdin is read, could we break other stdin consumers?

**analysis**:
- the fix is to read ALL of stdin instead of one line
- this is strictly more correct
- any consumer that expected only one line... would be a bug anyway

**holds**: readline → read-all is backwards compatible for correct use cases.

## question: are there other stdin consumers we could break?

**need to verify**: does rhachet/keyrack use stdin elsewhere?

**examples to check**:
- `keyrack fill` (probably prompts, not stdin pipe)
- other commands with `| rhx ...` pattern

**action**: during research, grep for stdin usage patterns.

## question: should the vision mention compact json workaround?

**observation**: `jq -c` produces compact (single-line) json. this would likely work around the bug.

**should we add to vision?**: no — the vision is about the correct fix, not workarounds. users shouldn't need to know about this.

**but**: useful for diagnosis. we can test `jq -c` to confirm "newline causes truncation" hypothesis.

## summary

all assumptions examined more deeply. key findings:

1. **code location unknown** — need to verify keyrack is in rhachet
2. **stdin IS read** — evidence shows partial read occurred
3. **backwards compatible** — read-all is strictly more correct than readline
4. **compact json workaround** — useful for diagnosis, not for users

no issues found in the vision itself. assumptions hold under deeper scrutiny.
