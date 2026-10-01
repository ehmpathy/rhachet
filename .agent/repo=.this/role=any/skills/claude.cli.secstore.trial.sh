#!/usr/bin/env bash
######################################################################
# .what = run a probe claude-code against a fake home inside the repo,
#         and report which credential file it reads and which it
#         writes, with and without CLAUDE_SECURESTORAGE_CONFIG_DIR=""
#
# .why  = proves by a run (not by a read of the code) where the
#         credential store lands under a per-actor CLAUDE_CONFIG_DIR —
#         the premise of the shared-credential-blank cure. it never
#         touches the real ~/.claude: HOME is a temp dir in the repo,
#         and every token it plants is a fake it made itself
#
# usage:
#   rhx claude.cli.probe --into .temp/claude-cli.probe --version 2.1.280
#   rhx claude.cli.secstore.trial --in .temp/claude-cli.probe
#
# options:
#   --in       the probe prefix `claude.cli.probe --into` made; must sit
#              inside the repo (required)
#
# requires: jq on the PATH (it reads each credential); refused if absent
#
# the scenarios:
#   read.unset    — the home store holds a valid fake login; the actor
#                   dir is empty; the var is unset
#   read.empty    — same, with CLAUDE_SECURESTORAGE_CONFIG_DIR=""
#   read.link     — the actor's credential is a symlink to the home store
#                   (the rhachet 1.48.0 topology); the var is unset
#   write.link    — the home store holds an EXPIRED fake login, the actor
#                   links to it, the var is unset. claude refreshes, the
#                   server rejects the fake token (invalid_grant), and
#                   claude-code's dead-token clear blanks the file under
#                   its secure-storage dir. where the blank lands = where
#                   a write lands
#   write.empty   — same expired login, no link, var = ""
#
# guarantee:
#   - HOME, the config dirs and every file live under .temp/ in the repo
#   - the env is built from empty (env -i): no real token, api key, or
#     config dir leaks in from the caller
#   - a credential is reported as planted | blank | other, never a value
#   - write.* sends one fake refresh token to the oauth endpoint
#   - exit 0 = trial ran (the verdicts are the result)
#   - exit 1 = malfunction (the probe did not run)
#   - exit 2 = constraint (bad args, prefix outside the repo, no install,
#     no jq)
######################################################################

set -euo pipefail

# parse args
IN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --in) IN="$2"; shift 2 ;;
    # the rhx runner forwards its own dispatch flags; skip them
    --skill|--repo|--role) shift 2 ;;
    --help|-h)
      sed -n '2,48p' "$0"
      exit 0
      ;;
    *)
      echo "✋ ConstraintError: claude.cli.secstore.trial: unknown arg '$1'" >&2
      exit 2
      ;;
  esac
done
if [[ -z "$IN" ]]; then
  echo "✋ ConstraintError: claude.cli.secstore.trial needs --in" >&2
  echo "   usage: claude.cli.secstore.trial --in <probe-prefix>" >&2
  exit 2
fi

# the probe prefix must sit inside the repo
REPO_ROOT="$(git rev-parse --show-toplevel)"
if [[ ! -d "$IN" ]]; then
  echo "✋ ConstraintError: no probe install at '$IN'" >&2
  echo "   fix: rhx claude.cli.probe --into $IN" >&2
  exit 2
fi
PREFIX="$(cd "$IN" && pwd -P)"
case "$PREFIX/" in
  "$REPO_ROOT"/*) ;;
  *)
    echo "✋ ConstraintError: --in must sit inside the repo ($REPO_ROOT)" >&2
    exit 2
    ;;
esac
CLAUDE_BIN="$PREFIX/node_modules/.bin/claude"
if [[ ! -x "$CLAUDE_BIN" ]]; then
  echo "✋ ConstraintError: no claude bin under '$IN'" >&2
  echo "   fix: rhx claude.cli.probe --into $IN" >&2
  exit 2
fi
if ! command -v jq >/dev/null; then
  echo "✋ ConstraintError: claude.cli.secstore.trial needs jq on the PATH, to read each credential" >&2
  echo "   fix: install jq (e.g. apt install jq)" >&2
  exit 2
fi

# .what = the first line of a text
#   usage: first_line_of text=<text>
first_line_of() {
  local text="" arg
  for arg in "$@"; do
    case "$arg" in
      text=*) text="${arg#text=}" ;;
      *) echo "💥 MalfunctionError: first_line_of: unknown arg '$arg'" >&2; exit 1 ;;
    esac
  done
  printf '%s' "${text%%$'\n'*}"
}

# .what = the last line of a text, cut to a max width
#   usage: last_line_of text=<text> width=<chars>
last_line_of() {
  local text="" width="" line arg
  for arg in "$@"; do
    case "$arg" in
      text=*) text="${arg#text=}" ;;
      width=*) width="${arg#width=}" ;;
      *) echo "💥 MalfunctionError: last_line_of: unknown arg '$arg'" >&2; exit 1 ;;
    esac
  done
  text="${text%$'\n'}"
  line="${text##*$'\n'}"
  printf '%s' "${line:0:$width}"
}

VERSION_OUT=""
VERSION_STATUS=0
VERSION_OUT="$(env -i PATH=/usr/bin:/bin HOME="$PREFIX" "$CLAUDE_BIN" --version 2>/dev/null)" || VERSION_STATUS=$?
VERSION="$(first_line_of text="$VERSION_OUT")"
if [[ "$VERSION_STATUS" -ne 0 || -z "$VERSION" ]]; then
  echo "💥 MalfunctionError: the probe claude did not print a version (exit $VERSION_STATUS)" >&2
  exit 1
fi

# the trial root, fresh each run, inside the repo; keyed by this run's pid, so a
#   concurrent run never clears the scenario dirs of another
TRIAL_ROOT="$REPO_ROOT/.temp/claude.secstore.trial/run.$$"
case "$TRIAL_ROOT/" in
  "$REPO_ROOT"/.temp/*) ;;
  *) echo "💥 MalfunctionError: trial root escaped .temp" >&2; exit 1 ;;
esac
rm -rf "$TRIAL_ROOT"
mkdir -p "$TRIAL_ROOT"

# a fake login; the refresh token is a marker we made, so it is safe to compare
#   usage: plant_credential path=<file> marker=<token> expires_ms=<epoch-ms>
plant_credential() {
  local path="" marker="" expires_ms="" arg
  for arg in "$@"; do
    case "$arg" in
      path=*) path="${arg#path=}" ;;
      marker=*) marker="${arg#marker=}" ;;
      expires_ms=*) expires_ms="${arg#expires_ms=}" ;;
      *) echo "💥 MalfunctionError: plant_credential: unknown arg '$arg'" >&2; exit 1 ;;
    esac
  done
  mkdir -p "$(dirname "$path")"
  printf '{"claudeAiOauth":{"accessToken":"fake-access-%s","refreshToken":"%s","expiresAt":%s,"scopes":["user:inference","user:profile"],"subscriptionType":"max"}}\n' \
    "$marker" "$marker" "$expires_ms" > "$path"
  chmod 600 "$path"
}

# .what = a path under the trial root, shown relative to it
#   usage: as_trial_relative path=<path>
as_trial_relative() {
  local path="" arg
  for arg in "$@"; do
    case "$arg" in
      path=*) path="${arg#path=}" ;;
      *) echo "💥 MalfunctionError: as_trial_relative: unknown arg '$arg'" >&2; exit 1 ;;
    esac
  done
  printf '%s' "${path#"$TRIAL_ROOT"/}"
}

# .what = epoch milliseconds, offset from now by a count of seconds
#   usage: epoch_ms_from_now seconds=<offset>
epoch_ms_from_now() {
  local seconds="" arg
  for arg in "$@"; do
    case "$arg" in
      seconds=*) seconds="${arg#seconds=}" ;;
      *) echo "💥 MalfunctionError: epoch_ms_from_now: unknown arg '$arg'" >&2; exit 1 ;;
    esac
  done
  echo "$(( ($(date +%s) + seconds) * 1000 ))"
}

# describe one credential path: absent | symlink → where | file; then planted | BLANK | other
#   usage: describe_credential path=<file> marker=<token>
describe_credential() {
  local path="" marker="" kind rt arg
  for arg in "$@"; do
    case "$arg" in
      path=*) path="${arg#path=}" ;;
      marker=*) marker="${arg#marker=}" ;;
      *) echo "💥 MalfunctionError: describe_credential: unknown arg '$arg'" >&2; exit 1 ;;
    esac
  done
  if [[ -L "$path" ]]; then
    kind="symlink → $(as_trial_relative path="$(readlink "$path")")"
    [[ -e "$path" ]] || kind="$kind (target absent)"
  elif [[ -f "$path" ]]; then
    kind="file"
  else
    echo "absent"
    return
  fi
  rt="$(jq -r '.claudeAiOauth.refreshToken // "∅"' "$path" 2>/dev/null)" || rt="?"
  if [[ "$rt" == "$marker" ]]; then echo "$kind, planted"
  elif [[ "$rt" == "" ]]; then echo "$kind, BLANK"
  else echo "$kind, other"
  fi
}

# the env a clone would get: built from empty
#   usage: run_claude scenario=<name> home=<dir> config_dir=<dir> secstore=<unset|value> -- <claude args…>
# .note = claude's own exits (0 = answered, 1 = refused, e.g. no login) are results the
#   trial reports; a timeout (124), an exec fault (126, 127) or a signal (>128) means the
#   probe did not run, and fails loud rather than render as a scenario row
run_claude() {
  local scenario="" home="" config_dir="" secstore=""
  while [[ $# -gt 0 && "$1" != "--" ]]; do
    case "$1" in
      scenario=*) scenario="${1#scenario=}" ;;
      home=*) home="${1#home=}" ;;
      config_dir=*) config_dir="${1#config_dir=}" ;;
      secstore=*) secstore="${1#secstore=}" ;;
      *) echo "💥 MalfunctionError: run_claude: unknown arg '$1'" >&2; exit 1 ;;
    esac
    shift
  done
  [[ "${1:-}" == "--" ]] && shift
  local env_args=(PATH=/usr/bin:/bin HOME="$home" CLAUDE_CONFIG_DIR="$config_dir" DISABLE_AUTOUPDATER=1 TERM=dumb)
  if [[ "$secstore" != "unset" ]]; then env_args+=(CLAUDE_SECURESTORAGE_CONFIG_DIR="$secstore"); fi
  local status=0
  env -i "${env_args[@]}" timeout 90 "$CLAUDE_BIN" "$@" < /dev/null 2>&1 || status=$?
  if [[ "$status" -gt 1 ]]; then
    echo "💥 MalfunctionError: the probe claude did not run in scenario '$scenario' (exit $status)" >&2
    return 1
  fi
}

FAR_MS="$(epoch_ms_from_now seconds=$(( 30 * 86400 )))"
PAST_MS="$(epoch_ms_from_now seconds=-3600)"

echo "🔭 claude.cli.secstore.trial --in $IN"
echo "   ├─ claude: $VERSION"
echo "   ├─ root: .temp/claude.secstore.trial"
echo "   │"

# ---- read scenarios: which file does `auth status` read?
for scenario in read.unset read.empty read.link; do
  s_root="$TRIAL_ROOT/$scenario"
  home="$s_root/home"
  actor="$s_root/actor/brain/.claude"
  marker="fake-refresh-$scenario"
  mkdir -p "$actor"
  plant_credential path="$home/.claude/.credentials.json" marker="$marker" expires_ms="$FAR_MS"
  secstore="unset"
  [[ "$scenario" == "read.empty" ]] && secstore=""
  [[ "$scenario" == "read.link" ]] && ln -s "$home/.claude/.credentials.json" "$actor/.credentials.json"
  out="$(run_claude scenario="$scenario" home="$home" config_dir="$actor" secstore="$secstore" -- auth status --json)"
  logged_in="$(printf '%s' "$out" | jq -r '.loggedIn | tostring' 2>/dev/null)" || logged_in="? ($(last_line_of text="$out" width=160))"
  echo "   ├─ $scenario  (secstore var: ${secstore:-\"\"})"
  echo "   │  └─ auth status → loggedIn: $logged_in"
done
echo "   │"

# ---- write scenarios: where does claude-code's dead-token clear land?
for scenario in write.link write.empty; do
  s_root="$TRIAL_ROOT/$scenario"
  home="$s_root/home"
  actor="$s_root/actor/brain/.claude"
  marker="fake-refresh-$scenario"
  mkdir -p "$actor"
  plant_credential path="$home/.claude/.credentials.json" marker="$marker" expires_ms="$PAST_MS"
  secstore="unset"
  [[ "$scenario" == "write.empty" ]] && secstore=""
  [[ "$scenario" == "write.link" ]] && ln -s "$home/.claude/.credentials.json" "$actor/.credentials.json"
  out="$(run_claude scenario="$scenario" home="$home" config_dir="$actor" secstore="$secstore" -- -p "reply with ok" --max-turns 1)"
  echo "   ├─ $scenario  (secstore var: ${secstore:-\"\"})"
  echo "   │  ├─ claude said: $(last_line_of text="$out" width=140)"
  echo "   │  ├─ home  .credentials.json: $(describe_credential path="$home/.claude/.credentials.json" marker="$marker")"
  echo "   │  ├─ actor .credentials.json: $(describe_credential path="$actor/.credentials.json" marker="$marker")"
  echo "   │  ├─ home  .claude/ holds: $(cd "$home/.claude" && ls -A | tr '\n' ' ')"
  echo "   │  └─ actor brain/.claude/ holds: $(cd "$actor" && ls -A | tr '\n' ' ')"
done
echo "   │"
echo "   └─ done — no real credential was read or written"
