#!/usr/bin/env bash
######################################################################
# .what = run a keyrack verb against a private daemon, built from this
#         worktree, apart from the box's shared daemon
#
# .why  = a live proof of a daemon change needs the new build in the
#         daemon. a restart of the shared daemon drops every key that
#         other groves hold (prep, prod), so the proof runs in its own
#         daemon instead: the socket path keys on XDG_RUNTIME_DIR, so a
#         private runtime dir yields a private daemon
#
# usage:
#   rhx keyrack.private --dir /tmp/krp -- status --owner ehmpath
#   rhx keyrack.private --dir /tmp/krp --repo-key ahbode.camp.AWS_PROFILE -- unlock --owner ehmpath --env camp
#
# options:
#   --dir        the private runtime dir, under /tmp (required)
#   --repo-key   a full slug ($org.$env.$KEY). the verb then runs from a
#                stand-in repo under --dir whose manifest declares just
#                that key, so a key of a foreign org is in reach without
#                a cwd inside that org's repo
#
# guarantee:
#   - the dir is created 0700 if absent (XDG_RUNTIME_DIR demands it)
#   - the dir must sit under /tmp, short enough for a unix socket path
#   - the args after `--` pass to this worktree's `rhx keyrack` verbatim
#   - the shared daemon is never touched
######################################################################

set -euo pipefail

DIR=""
REPO_KEY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      DIR="$2"
      shift 2
      ;;
    --repo-key)
      REPO_KEY="$2"
      shift 2
      ;;
    --help|-h|help)
      # print the header: what, why, usage, options, guarantee
      sed -n '3,27p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    # the dispatcher's own flags; recognized, so the default arm stays a true refusal
    --repo|--role|--skill)
      shift 2
      ;;
    --)
      shift
      break
      ;;
    *)
      echo "✋ ConstraintError: keyrack.private got an unknown arg: $1" >&2
      echo "   └─ usage: rhx keyrack.private --dir /tmp/<name> [--repo-key org.env.KEY] -- <keyrack verb and flags>" >&2
      exit 2
      ;;
  esac
done

# guard: the dir is required and bounded to /tmp
if [[ -z "$DIR" || "$DIR" != /tmp/* ]]; then
  echo "✋ ConstraintError: --dir must name a path under /tmp" >&2
  echo "   └─ usage: rhx keyrack.private --dir /tmp/<name> [--repo-key org.env.KEY] -- <keyrack verb and flags>" >&2
  exit 2
fi

# guard: a verb is required
if [[ $# -eq 0 ]]; then
  echo "✋ ConstraintError: no keyrack verb after --" >&2
  echo "   └─ usage: rhx keyrack.private --dir /tmp/<name> [--repo-key org.env.KEY] -- <keyrack verb and flags>" >&2
  exit 2
fi

# findsert the private runtime dir, owner-only
mkdir -p "$DIR"
chmod 700 "$DIR"

# no repo key: run from this worktree, via the consumer path
if [[ -z "$REPO_KEY" ]]; then
  XDG_RUNTIME_DIR="$DIR" npx rhx keyrack "$@"
  exit $?
fi

# guard: the repo key is a full slug
IFS='.' read -r KEY_ORG KEY_ENV KEY_NAME <<< "$REPO_KEY"
if [[ -z "$KEY_ORG" || -z "$KEY_ENV" || -z "$KEY_NAME" ]]; then
  echo "✋ ConstraintError: --repo-key must be a full slug, \$org.\$env.\$KEY" >&2
  echo "   └─ got: $REPO_KEY" >&2
  exit 2
fi

# findsert a stand-in repo whose manifest declares just that key
STANDIN="$DIR/repo"
mkdir -p "$STANDIN/.agent"
[[ -d "$STANDIN/.git" ]] || git -C "$STANDIN" init -q
printf 'org: %s\nenv.%s:\n  - %s\n' "$KEY_ORG" "$KEY_ENV" "$KEY_NAME" > "$STANDIN/.agent/keyrack.yml"

# run this worktree's build from the stand-in
# .why = `npx rhx` from the stand-in would find no rhachet; the build under proof is here
WORKTREE="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
cd "$STANDIN"
XDG_RUNTIME_DIR="$DIR" "$WORKTREE/bin/rhx" keyrack "$@"
