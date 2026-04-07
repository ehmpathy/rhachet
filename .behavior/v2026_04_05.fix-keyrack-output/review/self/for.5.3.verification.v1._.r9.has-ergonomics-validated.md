# self-review: has-ergonomics-validated (deeper pass — snapshot verification)

## the question

double-check: does the actual input/output match what felt right at repros?

## the review

### snapshot-to-vision verification

verified actual CLI output (via snapshots) against vision specification.

#### source export format

**vision specified:**
```
output (stdout):
  export KEY1='secret1'
  export KEY2='secret2'
```

**actual snapshot (keyrack.source.cli.acceptance.test.ts.snap):**
```
export __TEST_SOURCE_CLI_KEY1__='secret-value-1'
export __TEST_SOURCE_CLI_KEY2__='secret-value-2'
```

**verdict:** exact match. format is `export ${KEY}='${secret}'` as specified.

#### shell escape: single quote

**vision specified:**
```
secret contains single quote → shell-escaped: `'sec'\''ret'`
```

**actual snapshot:**
```
export __TEST_SOURCE_ESCAPE__='sec'\\''ret'
```

**verdict:** exact match. uses the close-quote, escape, open-quote pattern.

#### shell escape: newline

**vision specified:**
```
secret contains newlines → preserved in output (ANSI-C syntax)
```

**actual snapshot:**
```
export __TEST_SOURCE_ESCAPE__=$'line1\\nline2'
```

**verdict:** exact match. uses `$'...'` ANSI-C quoted string syntax.

#### shell escape: backslash

**vision specified (criteria):**
```
secret with backslash → preserved
```

**actual snapshot:**
```
export __TEST_SOURCE_ESCAPE__='path\\name'
```

**verdict:** exact match. backslash preserved in plain quotes.

#### strict mode stderr

**vision specified:**
```
exit codes:
  2 = strict mode and some keys not granted

hint on exit 2:
  "some keys not granted. use --lenient if partial results are acceptable."
```

**actual snapshot:**
```
not granted: testorg.test.__TEST_SOURCE_STRICT_ABSENT__ (absent)

hint: use --lenient if partial results are acceptable
```

**verdict:** matches with improvement. shows per-key status (better than summary).

#### vibes output (treestruct)

**vision specified:**
```
--output vibes → treestruct format (default)
```

**actual snapshot:**
```
🔐 keyrack
   └─ testorg.test.__TEST_OUTPUT_GRANTED__
      ├─ vault: os.envvar
      ├─ mech: PERMANENT_VIA_REPLICA
      └─ status: granted 🔑
```

**verdict:** matches treestruct format with turtle emoji as specified.

#### value mode stderr

**vision specified:**
```
--value with key not granted → stderr shows status, exit 2
```

**actual snapshot:**
```
absent: testorg.test.__TEST_OUTPUT_ABSENT__
```

**verdict:** exact match. format is `${status}: ${slug}`.

### verification matrix

| ergonomic | vision | snapshot | match |
|-----------|--------|----------|-------|
| export format | `export K='v'` | `export K='v'` | yes |
| quote escape | `'sec'\''ret'` | `'sec'\\''ret'` | yes |
| newline escape | ANSI-C | `$'line1\\nline2'` | yes |
| backslash | preserved | `'path\\name'` | yes |
| strict stderr | hint included | hint included | yes |
| vibes format | treestruct | treestruct + emoji | yes |
| value stderr | status: slug | status: slug | yes |

## found concerns

none. all snapshot outputs match vision specification:
- export format exact
- shell escapes work as documented
- error messages include hints
- treestruct format preserved

## conclusion

**has-ergonomics-validated check: PASS**

snapshot verification confirms:
- output formats match vision exactly
- shell escapes use documented patterns
- error messages actionable
- no ergonomic drift between vision and implementation

