# F9 — `--source @stdin` reads to eof, with no timeout

- **fork** — read the pipe until eof, as every unix pipe reader does · add a read timeout that refuses a non-tty stdin with no writer
- **taken** — read to eof. a tty, the stdin a human leaves by mistake, is refused at once (exit 2, no hang). a non-tty stdin with no writer is a caller that asked to wait; a timeout would cut off a slow upstream `aws ssm get-parameter`, the very read the commander pipes in, and any bound picked is a guess at network latency
- **rework** — clean. a `--timeout` (or a default bound) is an addition at `getOneKeyrackSetSourcePiped`; no caller depends on its absence
- **confidence** — 85%. an unattended runner that inherits an idle stdin would wait; the commander's one command always has a writer
- **the ssh case** — over `ssh box rhx keyrack set … --source @stdin` with no `-t`, the remote stdin is a pipe, so the tty refusal does not fire. with the left-hand side dropped, the remote waits for eof while the local terminal still echoes, and the failure shows as a hang. the commander's command always has a writer, so this needs a dropped left-hand side; a timeout would cure it, at the cost the fork names (peer round i004, r011)
- **where** — peer round i003 on `5.1.execution.from_vision`, r010 item 7; `src/domain.operations/keyrack/cli/getOneKeyrackSetSourcePiped.ts`
- **verdict** — open; to commander at pr
