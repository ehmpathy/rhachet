# domain.term: tail

term.chosen   = tail
term.kind     = noun
term.boundary = install.output
term.synonyms.forbidden:
- truncate
- snippet
- excerpt
- summary
- redact

## .what

the last N lines of a captured package-manager log, kept on an error's metadata in place of
the whole.

⚠️ a tail is a **bound on bulk**, never a redaction of the diagnosis. it is chosen because the
cause lives at the END of a log — the last error line names it — so the tail keeps the part
that carries the fix and drops only the bytes the human already saw streamed.

## .refs

- src/domain.operations/upgrade/asNpmInstallFailureError.ts (`asOutputTail`, `NPM_INSTALL_OUTPUT_TAIL_LINES`)

## .reason

- `term=tail._.choice.reason.md`
