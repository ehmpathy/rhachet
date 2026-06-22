# claude-code.hook-output-limit

## .name

"Persisted output" — marked with `<persisted-output>` tag in output.

## .what

claude code persists hook outputs to disk when they exceed 50,000 characters.

## .when

shipped in v2.1.89 (2026-04-01)

## .behavior

| output size | result |
|-------------|--------|
| <= 50K chars | lands in context |
| > 50K chars | saved to disk, 2KB preview in context |

## .problem

"phantom reads" bug: claude often doesn't follow up to read the persisted file, so content effectively disappears from context.

## .detection

none. claude code doesn't signal hooks when output gets persisted. hooks must self-check size.

## .configuration

threshold is fixed at 50K chars. not configurable via settings.json or elsewhere.

## .implications for rhachet

`roles boot` outputs can exceed 50K easily (mechanic was 167KB). briefs that load via sessionstart hooks may silently fail to reach context.

## .options

1. hook-side: self-limit output, truncate with warn if over ~45K
2. feature request: env var `CLAUDE_HOOK_MAX_OUTPUT` so hooks can adapt
3. workaround: split briefs across multiple hooks, each under 50K

## .why they shipped it

session resume failures. large outputs serialized into session JSONL files caused `/resume` to hang. the 50K limit caps session state bloat.

## .related issues

| issue | status | problem |
|-------|--------|---------|
| #17407 (phantom reads) | closed - won't fix | 71% of prompts affected, server-side state controls behavior |
| #23948 (session hang) | open | full output still serialized despite truncation, resume still hangs |
| #19297 (context limits) | open | request for configurable thresholds |
| #23711 (compaction) | open | related compaction trigger config |

no configurable threshold. no opt-out. no env var detection. hooks must self-limit.

## .sources

- claude code changelog v2.1.89
- claude code week 14 notes (2026-03-30 to 2026-04-03)
- hooks reference docs
- github.com/anthropics/claude-code/issues/17407
- github.com/anthropics/claude-code/issues/23948
- github.com/anthropics/claude-code/issues/19297
- github.com/anthropics/claude-code/issues/23711
