# ref: the two dirs — config (`we()`) vs secure storage (`_S()`)

> zoom-in of `ref.claude-code.credential-store._.md`. source: `@anthropic-ai/claude-code@2.1.280`.

## .claim 1 — the secure-storage dir reads its own var and falls back to the config dir

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'CLAUDE_SECURESTORAGE_CONFIG_DIR' --radius 350 --limit 12
```

```js
import{homedir as o,userInfo as u}from"os";import{join as l}from"path";var Oen="-credentials";
function _S(){let n=process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR;if(n!==void 0)return(n||l(o(),".claude")).normalize("NFC");return we()}
```

| `CLAUDE_SECURESTORAGE_CONFIG_DIR` | `_S()` returns |
|---|---|
| unset | `we()` — the config dir. **this is the 1.48.0 clone: `_S()` = the actor's brain dir** |
| `""` | `join(homedir(), ".claude")` — the machine dir, whatever `CLAUDE_CONFIG_DIR` says |
| a path | that path |

## .claim 2 — the config dir reads `CLAUDE_CONFIG_DIR`; so does the global config file

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'env\.CLAUDE_CONFIG_DIR' --radius 250 --limit 12
```

```js
function s(){return process.env.CLAUDE_CONFIG_DIR}var we=Yo(()=>(s()??a(g(),".claude")).normalize("NFC"),s);
function kFn(){let t=`.claude${Nz()}.json`;return S(process.env.CLAUDE_CONFIG_DIR||Dt(),t)}
```

⇒ `.claude.json` (the global config) is per actor under 1.48.0 — no cross-actor write lands there.

## .claim 3 — what lives under which dir

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'credentials\.json' --radius 600 --limit 8
```

```js
var dEt=".credentials.json",pEt=".device-keys.json";function hxn(){return vm(aQ(),".claude",pEt).normalize("NFC")}
…vm(we(),wur),vm(_S(),dEt),hxn()]}
```

| file | dir | shared across actors under 1.48.0? |
|---|---|---|
| `.credentials.json` | `_S()` | only by rhachet's symlink |
| `.oauth_refresh.lock`, `<_S()>.lock`, `.storage-write`, `.design_oauth_refresh.lock` | `_S()` | **no — one set per actor** (`.locks.md`) |
| user settings, `CLAUDE.md`, `boot.md` | `we()` | no, by design (`define.brain-dir-repo-vs-actor.md`) |
| `.claude.json` | `CLAUDE_CONFIG_DIR`, else home | no |
| `.device-keys.json` | `~/.claude`, always | yes — not touched by either var |

⇒ **the credential store is the one machine-global state a clone writes.** the per-actor config dir keeps
its boot either way.

## .claim 4 — on macOS the keychain entry name follows the same var

same command as claim 1:

```js
function q0e(n=""){let e=process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR,t=e!==void 0?!e:!process.env.CLAUDE_CONFIG_DIR,r=e!==void 0?e.normalize("NFC"):we(),c=t?"":`-${a("sha256").update(r).digest("hex").substring(0,8)}`;return`Claude Code${nn().OAUTH_FILE_SUFFIX}${n}${c}`}
```

| env | keychain service suffix | reaches the human's login? |
|---|---|---|
| neither var | none | ✅ |
| `CLAUDE_CONFIG_DIR` only (a 1.48.0 clone) | `-sha256(config dir)[0:8]` | 🔴 a per-actor entry, empty |
| `CLAUDE_SECURESTORAGE_CONFIG_DIR=""` | none | ✅ |
| `CLAUDE_SECURESTORAGE_CONFIG_DIR=/home/x/.claude` | `-sha256(path)[0:8]` | 🔴 even the default path, spelled out, is a new entry |

⇒ **`""` is the one value that means "the default store" on linux and macos alike.**

## .claim 5 — claude-code treats the var as a supported relocation

same command as claim 1. teammates inherit it, and an empty value survives:

```js
let o=process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR;if(o!==void 0)n.push(`CLAUDE_SECURESTORAGE_CONFIG_DIR=${eo([o])}`);return n.join(" ")
if(o===""&&n!=="CLAUDE_SECURESTORAGE_CONFIG_DIR")continue;e[n]=o
```

a project or local settings file cannot set it — it must come from the process env (which is how
rhachet already sets `CLAUDE_CONFIG_DIR`):

```js
…"CLAUDE_CONFIG_DIR","CLAUDE_SECURESTORAGE_CONFIG_DIR","CLAUDE_CODE_TMPDIR",…
var B=new Set(["projectSettings","localSettings"]);function u(e,n,o){if(!e||!B.has(n))return e;…if(!k(r))continue;…
```

## .claim 6 — public status: undocumented, relied on, `""` is the known idiom

- [anthropics/claude-code#79223](https://github.com/anthropics/claude-code/issues/79223), opened
  2026-07-19, open, labels `area:auth` `area:docs`: *"Document CLAUDE_SECURESTORAGE_CONFIG_DIR
  (credential-store location override — widely used by ecosystem tooling, currently undocumented)"*.
- the same issue: *"Empty string ≠ unset: an empty value pins the default credential store even when
  `CLAUDE_CONFIG_DIR` is set; merely unsetting the variable does not, because `CLAUDE_CONFIG_DIR` then
  drives the derivation."* — verified there against 2.1.206/2.1.207 and 2.1.215; claim 1 above
  verifies it against 2.1.280.
- the same issue lists tools that pin it to `""` *"in their container/provider setups to force the
  default store"*: claudex-switch, agent-fleet, claude-pod, switchroom, among others.
- related reports: [sbigstar0310/cc-donut#84](https://github.com/sbigstar0310/cc-donut/issues/84),
  [mhelbich/VS-Code-Claude-Usage#38](https://github.com/mhelbich/VS-Code-Claude-Usage/pull/38).

⚠️ **the risk this carries:** an undocumented var can change without a changelog line. it has held
from 2.1.206 to 2.1.280, and claude-code's own teammate spawn depends on it (claim 5). a clamp that
checks its effect would catch a regression.
