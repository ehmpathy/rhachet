# self-review: has-ergonomics-validated (r9)

## approach

the guide mentions compare to repros artifact. however:
- no repros artifact exists for this behavior
- this is a feature addition, not a bug fix
- ergonomics were defined in the vision artifact instead

step 1: compare vision-planned input to actual input
step 2: compare vision-planned output to actual output
step 3: assess any drift

## step 1: input ergonomics

### vision-planned input

from vision:
```bash
npx rhachet repo compile --from src --into dist
```

optional overrides:
```bash
--include 'data/**/*.json'
--exclude 'vendor/**'
```

### actual input

from invokeRepoCompile.ts:
- `--from <path>` — required, source directory
- `--into <path>` — required, target directory
- `--include <glob>` — optional, additional patterns
- `--exclude <glob>` — optional, exclusion patterns

**assessment:** input matches vision exactly. named args (`--from`, `--into`) vs positional was discussed in vision as acceptable tradeoff for clarity.

## step 2: output ergonomics

### vision-planned output

from vision:
```
🔭 Load getRoleRegistry from {package}...

📦 Compile artifacts for {N} role(s)...
   + {role}: {N} file(s)

🌊 Done, compiled {N} file(s) to {dir}
```

### actual output

from snapshot:
```
🔭 Load getRoleRegistry from rhachet-roles-test...

📦 Compile artifacts for 1 role(s)...
   + test-role: 2 file(s)

🌊 Done, compiled 2 file(s) to dist
```

**assessment:** output matches vision exactly. turtle vibes preserved. structure is scannable.

### error output

from snapshot:
```
⛈️ BadRequestError: --from directory not found

{
  "from": "nonexistent"
}

[args] repo,compile,--from,nonexistent,--into,dist
```

**assessment:** error output follows established turtle vibes pattern. includes context metadata for debug. args shown at bottom for reproduction.

## step 3: drift assessment

| element | vision | actual | drift? |
|---------|--------|--------|--------|
| command | `npx rhachet repo compile --from src --into dist` | same | no |
| --include | `--include 'pattern'` | same | no |
| --exclude | `--exclude 'pattern'` | same | no |
| success output | turtle vibes with progress | same | no |
| error output | fail-fast with context | same | no |

**no drift detected.** implementation matches vision.

## why it holds

1. **no repros artifact** — ergonomics were designed in vision, not repros (feature addition, not bug fix)

2. **input matches vision** — command signature exactly as planned:
   - `--from` and `--into` named args (not positional)
   - `--include` and `--exclude` for overrides
   - familiar rsync-style patterns

3. **output matches vision** — all elements present:
   - `🔭 Load getRoleRegistry...` — shows package name
   - `📦 Compile artifacts...` — shows role count and per-role file count
   - `🌊 Done, compiled...` — shows total and target dir

4. **no ergonomic drift** — implementation faithful to design. users get exactly what was sketched.

5. **error ergonomics clear** — fail-fast with context metadata. includes args for reproduction. follows established `⛈️ BadRequestError` pattern.

