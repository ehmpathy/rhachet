#!/usr/bin/env bash
######################################################################
# .what = time how the dispatcher reads its payload from a pipe: the
#         bash `read` builtin vs one buffered `cat`, at a given size
#
# .why  = bash's `read` takes a pipe one byte per syscall; claude hands
#         a hook its payload on a pipe, and a Write payload can be large.
#         this reads the cost of each method alone, apart from any rule
#
# usage:
#   rhx hooks.dispatch.read.probe
#   rhx hooks.dispatch.read.probe --bytes 1000000 --runs 5
#
# guarantee:
#   - cpu is GNU time user + sys of the read alone, median of --runs
#   - each method's result is checked byte-equal to the input
#   - writes only to a temp dir it removes
#   - exit 0 = read, 1 = a method lost bytes, 2 = bad input
######################################################################
set -euo pipefail

BYTES=1000000
RUNS=5
while [[ $# -gt 0 ]]; do
  case "$1" in
    --bytes) BYTES="$2"; shift 2 ;;
    --runs) RUNS="$2"; shift 2 ;;
    --help|-h) awk 'NR > 2 && /^#/ { sub(/^# ?/, ""); print } /^set -euo/ { exit }' "${BASH_SOURCE[0]}" | grep -v '^#*$' || :; exit 0 ;;
    --skill|--repo|--role) shift 2 ;;
    *) echo "✋ ConstraintError: unknown arg '$1'; see --help" >&2; exit 2 ;;
  esac
done
[[ "$BYTES" =~ ^[0-9]+$ && "$RUNS" =~ ^[0-9]+$ ]] || { echo "✋ ConstraintError: --bytes and --runs take whole numbers" >&2; exit 2; }
/usr/bin/time -f '%U' true > /dev/null 2>&1 || { echo "✋ ConstraintError: GNU time is required" >&2; echo "   └─ hint: this read is linux-only; BSD time has no -f" >&2; exit 2; }

DIR=$(mktemp -d)
trap 'rm -rf "$DIR"' EXIT

# the input: BYTES of `a`, then one newline, as a payload may end
{ head -c "$BYTES" /dev/zero | tr '\0' a; printf '\n'; } > "$DIR/in"

# each method reads stdin into a var, then writes the var back out to compare
METHOD_READ='x=""; IFS= read -r -d "" x || :; printf "%s" "$x" > "$1"'
METHOD_CAT='x=$(cat; printf .); x="${x%.}"; printf "%s" "$x" > "$1"'

# cpu ms of one method, median of RUNS, each run fed through a pipe
as_median() { sort -n | awk '{ a[NR] = $1 } END { print (NR % 2) ? a[(NR + 1) / 2] : int((a[NR / 2] + a[NR / 2 + 1]) / 2) }'; }
measure() {
  local body="$1" out="$2" i line
  : > "$DIR/ms"
  for ((i = 0; i < RUNS; i++)); do
    line=$( { cat "$DIR/in" | /usr/bin/time -f '%U %S' bash -c "$body" _ "$out" ; } 2>&1 | tail -n 1)
    awk -v l="$line" 'BEGIN { split(l, a, " "); printf "%.0f\n", (a[1] + a[2]) * 1000 }' >> "$DIR/ms"
  done
  as_median < "$DIR/ms"
}

ms_read=$(measure "$METHOD_READ" "$DIR/out.read")
ms_cat=$(measure "$METHOD_CAT" "$DIR/out.cat")
same_read="no"; cmp -s "$DIR/in" "$DIR/out.read" && same_read="yes"
same_cat="no"; cmp -s "$DIR/in" "$DIR/out.cat" && same_cat="yes"

echo "heres the read..."
echo ""
echo "🧮 hooks.dispatch.read.probe --bytes $BYTES --runs $RUNS"
echo "   ├─ bash = $BASH_VERSION"
echo "   ├─ read builtin"
echo "   │  ├─ cpu = $ms_read ms"
echo "   │  └─ bytes kept = $same_read"
echo "   └─ cat, with a sentinel"
echo "      ├─ cpu = $ms_cat ms"
echo "      └─ bytes kept = $same_cat"
[[ "$same_read" == yes && "$same_cat" == yes ]] || exit 1
