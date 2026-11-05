#!/usr/bin/env bash
######################################################################
# .what = run this tree's acceptance tests against a PUBLISHED rhachet
#         release's dist, then put this tree's dist back
#
# .why  = a defect fix owes its red half: the new acceptance test must
#         fail on the release the defect was reported against. the cli
#         under test (`bin/run` → `bin/run.jit`) loads `./dist`, so a swap
#         of `./dist` for the release's dist runs today's tests over the
#         old build, end to end, with no checkout of old source
#
# usage:
#   rhx test.against.release --version 1.49.1 \
#     --scope blackbox/cli/init.hooks.outside-repo.acceptance.test.ts \
#     --name 'case1' --expect red
#
# options:
#   --version  the published rhachet version, e.g. 1.49.1 (required)
#   --scope    a jest path pattern for the acceptance files (required)
#   --name     a jest test name pattern (optional)
#   --expect   red | green — the outcome the release should show (required)
#
# guarantee:
#   - the tarball lands in .temp/release=<version>/ (gitignored), never
#     outside the repo
#   - ./dist is restored on every exit, the jest result aside; if the
#     process is killed mid-run, `npm run build` rebuilds it
#   - the jest log lands at .temp/release=<version>/jest.log
#   - exit 0 = the outcome matched --expect; exit 1 = it did not;
#     exit 2 = bad args
######################################################################
set -euo pipefail

VERSION=""; SCOPE=""; NAME=""; EXPECT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --scope) SCOPE="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --expect) EXPECT="$2"; shift 2 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "✋ ConstraintError: unknown option $1" >&2; exit 2 ;;
  esac
done
[[ -n "$VERSION" && -n "$SCOPE" ]] || { echo "✋ ConstraintError: --version and --scope are required" >&2; exit 2; }
[[ "$EXPECT" == "red" || "$EXPECT" == "green" ]] || { echo "✋ ConstraintError: --expect must be red or green" >&2; exit 2; }
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "✋ ConstraintError: --version must look like 1.49.1" >&2; exit 2; }

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
[[ -d dist ]] || { echo "✋ ConstraintError: ./dist is absent; run npm run build first" >&2; exit 2; }

WORK=".temp/release=$VERSION"
rm -rf "$WORK"
mkdir -p "$WORK"

# fetch and unpack the release, inside the repo. download the registry tarball, never `npm pack`:
#   inside this repo `npm pack rhachet@<v>`, and even `npm pack <url>`, packs the local tree
#   (measured 2026-10-26: both wrote rhachet-1.50.1.tgz for --version 1.49.1)
TARBALL_URL="$(npm view "rhachet@$VERSION" dist.tarball 2>/dev/null)"
[[ -n "$TARBALL_URL" ]] || { echo "✋ ConstraintError: rhachet@$VERSION is not on the registry" >&2; exit 2; }
curl -fsSL "$TARBALL_URL" -o "$WORK/rhachet-$VERSION.tgz"
tar -xzf "$WORK/rhachet-$VERSION.tgz" -C "$WORK"
[[ -d "$WORK/package/dist" ]] || { echo "💥 MalfunctionError: the release tarball holds no dist" >&2; exit 1; }
VERSION_UNPACKED="$(node -p "require('./$WORK/package/package.json').version")"
[[ "$VERSION_UNPACKED" == "$VERSION" ]] || { echo "💥 MalfunctionError: unpacked $VERSION_UNPACKED, not $VERSION" >&2; exit 1; }

# swap the dist; restore it on every exit
mv dist "$WORK/dist.current"
restoreDist() {
  rm -rf dist
  mv "$WORK/dist.current" dist
}
trap restoreDist EXIT
cp -R "$WORK/package/dist" dist

# run the acceptance tests over the release's build
ARGS=(-c ./jest.acceptance.config.ts --forceExit --no-colors "$SCOPE")
[[ -n "$NAME" ]] && ARGS+=(-t "$NAME")
set +e
npx jest "${ARGS[@]}" >"$WORK/jest.log" 2>&1
STATUS=$?
set -e
OUTCOME="green"
[[ $STATUS -ne 0 ]] && OUTCOME="red"

echo "🧪 test.against.release --version $VERSION --expect $EXPECT"
echo "   ├─ release = $TARBALL_URL"
echo "   ├─ scope = $SCOPE"
[[ -n "$NAME" ]] && echo "   ├─ name = $NAME"
echo "   ├─ outcome = $OUTCOME (jest exit $STATUS)"
echo "   ├─ tests"
grep -E '^\s+(✓|✕)' "$WORK/jest.log" | sed 's/^\s*/   │  /' || true
echo "   ├─ log = $WORK/jest.log"
if [[ "$OUTCOME" == "$EXPECT" ]]; then
  echo "   └─ ✅ matched the expectation"
  exit 0
fi
echo "   └─ ✋ did not match the expectation"
exit 1
