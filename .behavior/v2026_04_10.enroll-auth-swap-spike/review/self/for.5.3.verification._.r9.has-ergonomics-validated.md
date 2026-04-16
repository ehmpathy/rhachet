# self-review: has-ergonomics-validated (r9)

review for ergonomic validation of input/output.

---

## the question

does the actual input/output match what felt right at repros?

---

## repros artifact status

### searched for repros artifact

```
$ ls .behavior/v2026_04_10.enroll-auth-swap/3.2.distill.repros.experience.*.md
> no files found
```

**result: no repros artifact was created for this spike.**

### why repros was not created

this spike followed a shortened route:

```
wish → vision → criteria → blueprint → roadmap → execution → verification
```

the repros phase (`3.2.distill`) was not part of this spike's route. ergonomic expectations come from the implementation design itself.

---

## deep dive: actual implementation ergonomics

i read the source code to verify input/output ergonomics match intuitive expectations.

### input ergonomics: spec format parser

from `asBrainAuthSpecShape.ts` (lines 12-16):

```typescript
/**
 * formats:
 * - 'pool(keyrack://org/env/KEY_*)' → { strategy: 'pool', source: 'keyrack://org/env/KEY_*' }
 * - 'solo(keyrack://org/env/KEY)' → { strategy: 'solo', source: 'keyrack://org/env/KEY' }
 * - 'keyrack://org/env/KEY' → { strategy: 'default', source: 'keyrack://org/env/KEY' }
 * - '' or null → { strategy: 'default', source: null }
 */
```

**ergonomic analysis:**

| format | intuition | actual | verdict |
|--------|-----------|--------|---------|
| `pool(keyrack://...)` | explicit pool strategy | parses to `{ strategy: 'pool' }` | **INTUITIVE** |
| `solo(keyrack://...)` | explicit solo strategy | parses to `{ strategy: 'solo' }` | **INTUITIVE** |
| `keyrack://...` | default (no wrapper) | parses to `{ strategy: 'default' }` | **INTUITIVE** |
| empty | no auth spec | parses to `{ source: null }` | **INTUITIVE** |

the format reads like english: "use a pool of keys from keyrack://org/env/KEY_*". the function wrapper syntax (`pool(...)`) is familiar from programming and shell contexts.

### error ergonomics: actionable messages

from `asBrainAuthSpecShape.ts` (lines 36-40, 52-55):

```typescript
// invalid source error
throw new BadRequestError(
  `invalid auth spec source: expected keyrack:// URI, got '${source}'`,
  { code: 'INVALID_SOURCE', spec, source },
);

// invalid format error
throw new BadRequestError(
  `invalid auth spec format: expected 'pool(keyrack://...)' or 'keyrack://...', got '${spec}'`,
  { code: 'INVALID_FORMAT', spec },
);
```

**ergonomic analysis:**

| error case | message includes | verdict |
|------------|------------------|---------|
| wrong source | what was expected, what was received | **ACTIONABLE** |
| wrong format | valid formats, invalid input | **ACTIONABLE** |
| both | error code for programmatic handling | **DEBUGGABLE** |

the errors tell the user exactly what to fix. they do not say "invalid spec" — they say "expected X, got Y".

### CLI ergonomics: option help text

from `invokeBrainsAuth.ts` (lines 102-111):

```typescript
.requiredOption(
  '--spec <spec>',
  'auth spec (e.g., pool(keyrack://org/env/KEY_*))',
)
.option('--owner <owner>', 'keyrack owner identity')
.option(
  '--output <mode>',
  'output mode: value (raw), json, vibes (default)',
)
.option('--value', 'shorthand for --output value')
.option('--json', 'shorthand for --output json')
```

**ergonomic analysis:**

| aspect | implementation | verdict |
|--------|----------------|---------|
| required option | `--spec` is required, not positional | **EXPLICIT** |
| example in help | `pool(keyrack://org/env/KEY_*)` | **DISCOVERABLE** |
| output shorthand | `--value` and `--json` flags | **CONVENIENT** |
| owner optional | defaults to keyrack default owner | **MINIMAL** |

the CLI follows convention: required options are marked, examples are provided, common flags have shorthands.

### output ergonomics: mode selection

from `invokeBrainsAuth.ts` (lines 142-171):

```typescript
switch (outputMode) {
  case 'value': {
    process.stdout.write(supplied.formatted);  // raw, no newline
    break;
  }
  case 'json': {
    console.log(JSON.stringify({
      brainSlug: supplied.brainSlug,
      credential: { slug: supplied.credential.slug },
      formatted: supplied.formatted,
    }, null, 2));  // pretty-printed
    break;
  }
  case 'vibes':
  default: {
    console.log('');
    console.log('🧠 brains auth supply');
    console.log(`   ├─ brain: ${supplied.brainSlug}`);
    console.log(`   ├─ credential: ${supplied.credential.slug}`);
    console.log(`   └─ status: supplied 🔑`);
    console.log('');
    break;
  }
}
```

**ergonomic analysis:**

| mode | use case | output style | verdict |
|------|----------|--------------|---------|
| value | pipe to other commands | raw, no trailing newline | **COMPOSABLE** |
| json | programmatic consumption | pretty-printed, structured | **PARSEABLE** |
| vibes | human inspection | tree format with emoji | **READABLE** |

the three modes cover the three main use cases: composition, automation, and human inspection.

---

## command design validation

### spike command structure

```
rhx brains auth supply --spec <spec>
rhx brains auth status --spec <spec>
```

**ergonomic analysis:**

| aspect | design choice | rationale |
|--------|---------------|-----------|
| `brains` namespace | groups brain-related commands | **ORGANIZED** |
| `auth` subcommand | groups auth-related commands | **HIERARCHICAL** |
| `supply` verb | provides credential for use | **CLEAR ACTION** |
| `status` verb | shows current state | **CLEAR ACTION** |

the command hierarchy follows git-style subcommand patterns (`git remote add`, `git branch list`).

### criteria alignment

the criteria expected `rhx enroll --auth pool(...)`. the spike implements `rhx brains auth supply --spec pool(...)`.

| criteria | spike | alignment |
|----------|-------|-----------|
| `--auth` flag | `--spec` flag | **DEFERRED** — enroll wrapper is phase 7 |
| spec format | spec format | **IDENTICAL** — `pool(keyrack://...)` |
| pool rotation | pool rotation | **IMPLEMENTED** — round-robin selection |

the spec format ergonomics are validated. the enroll integration is deferred by design.

---

## status command ergonomics

from `invokeBrainsAuth.ts` (lines 235-250):

```typescript
console.log('');
console.log('🧠 brains auth status');
console.log(`   ├─ spec: ${opts.spec}`);
console.log(`   ├─ credentials: ${capacities.length}`);
for (let i = 0; i < capacities.length; i++) {
  const cap = capacities[i]!;
  const isLast = i === capacities.length - 1;
  const prefix = isLast ? '└─' : '├─';
  console.log(`   ${prefix} ${cap.credential.slug}`);
  console.log(`      ├─ used: ${cap.tokens.used}%`);
  console.log(`      ├─ left: ${cap.tokens.left}%`);
  console.log(
    `      └─ refresh: ${cap.refreshAt ?? 'capacity available'}`,
  );
}
console.log('');
```

**ergonomic analysis:**

| element | purpose | verdict |
|---------|---------|---------|
| spec echo | confirms which spec is being queried | **CONTEXT** |
| credential count | quick summary | **SCANNABLE** |
| per-credential tree | detailed capacity info | **STRUCTURED** |
| used/left percentages | capacity at a glance | **INTUITIVE** |
| refresh time | when capacity returns | **ACTIONABLE** |

the status output tells the user everything they need to decide whether to supply or wait.

### empty state handling

from `invokeBrainsAuth.ts` (lines 211-217):

```typescript
if (slugs.length === 0) {
  console.log('');
  console.log('🧠 brains auth status');
  console.log(`   └─ no credentials found for spec`);
  console.log('');
  return;
}
```

**ergonomic analysis:**

empty state is handled gracefully — no crash, no confusing output, just a clear message.

---

## ergonomic issues found: NONE

i reviewed:

1. **input format** — reads like english, familiar syntax
2. **error messages** — include expected format and received value
3. **CLI help** — examples in option descriptions
4. **output modes** — cover composition, automation, and human inspection
5. **command hierarchy** — follows git-style subcommand patterns
6. **empty states** — handled gracefully

no ergonomic issues found. all implementations match intuitive expectations.

---

## checklist

| checklist item | status |
|----------------|--------|
| input format intuitive? | **YES** — `pool(keyrack://...)` reads as intent |
| errors actionable? | **YES** — include expected format |
| CLI help discoverable? | **YES** — examples in option descriptions |
| output modes appropriate? | **YES** — value, json, vibes cover all use cases |
| empty states handled? | **YES** — graceful messaging |

---

## verdict: PASS

the ergonomics are validated through code inspection:

1. **input**: spec format is intuitive (`pool(keyrack://org/env/KEY_*)`)
2. **errors**: include expected format and received value
3. **CLI**: option help includes examples
4. **output**: three modes for three use cases (composition, automation, inspection)
5. **hierarchy**: follows familiar git-style subcommand patterns

no repros artifact exists, but the implementation itself demonstrates good ergonomic design. the formats are self-explanatory, errors are actionable, and outputs are appropriate for each use case.
