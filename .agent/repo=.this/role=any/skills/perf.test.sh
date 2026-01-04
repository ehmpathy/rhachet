#!/usr/bin/env bash
######################################################################
# .what = performance measurement skill
# .why = measures rhachet CLI command execution time accurately
#        from bash (avoids Node.js spawn artifacts)
#
# implements industry best practices (per hyperfine):
#   - warmup runs (populate disk cache)
#   - shell spawn correction (subtract baseline overhead)
#   - interleaved measurements (detect drift)
#   - statistical analysis (mean, min, max, stddev)
#   - outlier detection
#
# modes:
#   1. minimal mode (no args): executes minimal work, used as target
#   2. measure mode (--measure): runs benchmark and reports time
#
# usage:
#   # minimal execution (baseline target)
#   ./.agent/repo=.this/role=any/skills/perf.test.sh
#
#   # measure run --skill (default)
#   ./.agent/repo=.this/role=any/skills/perf.test.sh --measure
#
#   # measure any command
#   ./.agent/repo=.this/role=any/skills/perf.test.sh --measure --cmd "./bin/run roles boot --repo .this --role any"
#
#   # custom benchmark
#   ./.agent/repo=.this/role=any/skills/perf.test.sh --measure --runs 50 --threshold 150
#
#   # compare two commands (overhead mode)
#   ./.agent/repo=.this/role=any/skills/perf.test.sh --measure --cmd "./bin/run run --skill perf.test" --baseline "./.agent/repo=.this/role=any/skills/perf.test.sh"
######################################################################

set -euo pipefail

# defaults
RUNS=30
WARMUP=5
THRESHOLD=350  # accounts for bun binary load (~200ms) + CLI + skill + variance
MEASURE=false
JSON_OUTPUT=false
CMD=""
BASELINE=""

# legacy defaults for backward compatibility
BINARY="./bin/run"
SKILL_NAME="perf.test"

# parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --measure)
      MEASURE=true
      shift
      ;;
    --runs)
      RUNS="$2"
      shift 2
      ;;
    --warmup)
      WARMUP="$2"
      shift 2
      ;;
    --threshold)
      THRESHOLD="$2"
      shift 2
      ;;
    --cmd)
      CMD="$2"
      shift 2
      ;;
    --baseline)
      BASELINE="$2"
      shift 2
      ;;
    --binary)
      BINARY="$2"
      shift 2
      ;;
    --skill)
      SKILL_NAME="$2"
      shift 2
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# minimal mode: just execute and exit
if [ "$MEASURE" = false ]; then
  echo "[perf.test] skill executed"
  exit 0
fi

######################################################################
# measure mode: run benchmark with best practices
######################################################################

# determine command to measure
if [ -z "$CMD" ]; then
  # legacy mode: use --binary and --skill
  CMD="$BINARY run --skill $SKILL_NAME"
fi

# determine baseline (optional, for overhead calculation)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -z "$BASELINE" ]; then
  # try to find direct skill script for legacy mode
  DIRECT_SKILL="${SCRIPT_DIR}/${SKILL_NAME}.sh"
  if [ -x "$DIRECT_SKILL" ]; then
    BASELINE="$DIRECT_SKILL"
  fi
fi

HAS_BASELINE=false
if [ -n "$BASELINE" ]; then
  HAS_BASELINE=true
fi

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  perf.test.sh benchmark                                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  runs: $RUNS  warmup: $WARMUP  threshold: ${THRESHOLD}ms"
echo "║  cmd: $CMD"
if [ "$HAS_BASELINE" = true ]; then
echo "║  baseline: $BASELINE"
fi
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# measure function: returns elapsed ms (nanosecond precision)
measure_ms() {
  local cmd="$1"
  local start end elapsed
  start=$(date +%s%N)
  eval "$cmd" > /dev/null 2>&1
  end=$(date +%s%N)
  elapsed=$(( (end - start) / 1000000 ))
  echo "$elapsed"
}

######################################################################
# phase 1: warmup (populate disk cache, stabilize system)
######################################################################
echo "[phase 1] warmup: $WARMUP runs to warm disk cache..."
for i in $(seq 1 "$WARMUP"); do
  if [ "$HAS_BASELINE" = true ]; then
    eval "$BASELINE" > /dev/null 2>&1 || true
  fi
  eval "$CMD" > /dev/null 2>&1 || true
done
echo "[phase 1] warmup complete"
echo ""

######################################################################
# phase 2: shell spawn correction (measure baseline overhead)
######################################################################
echo "[phase 2] calibrate: measure shell spawn baseline..."
shell_times=()
for i in $(seq 1 10); do
  shell_ms=$(measure_ms "true")  # empty command
  shell_times+=("$shell_ms")
done

# calculate shell baseline (average of middle values, exclude outliers)
IFS=$'\n' sorted_shell=($(sort -n <<<"${shell_times[*]}")); unset IFS
shell_baseline=$(( (sorted_shell[3] + sorted_shell[4] + sorted_shell[5] + sorted_shell[6]) / 4 ))
echo "[phase 2] shell baseline: ${shell_baseline}ms"
echo ""

######################################################################
# phase 3: interleaved measurement (detect drift/interference)
######################################################################
echo "[phase 3] measure: $RUNS runs..."
direct_times=()
rhachet_times=()

for i in $(seq 1 "$RUNS"); do
  if [ "$HAS_BASELINE" = true ]; then
    # alternate order each iteration to detect systematic drift
    if (( i % 2 == 0 )); then
      direct_ms=$(measure_ms "$BASELINE")
      rhachet_ms=$(measure_ms "$CMD")
    else
      rhachet_ms=$(measure_ms "$CMD")
      direct_ms=$(measure_ms "$BASELINE")
    fi

    # apply shell baseline correction
    direct_corrected=$((direct_ms - shell_baseline))
    rhachet_corrected=$((rhachet_ms - shell_baseline))

    # ensure non-negative
    (( direct_corrected < 0 )) && direct_corrected=0
    (( rhachet_corrected < 0 )) && rhachet_corrected=0

    direct_times+=("$direct_corrected")
    rhachet_times+=("$rhachet_corrected")
  else
    # no baseline - just measure command
    rhachet_ms=$(measure_ms "$CMD")
    rhachet_corrected=$((rhachet_ms - shell_baseline))
    (( rhachet_corrected < 0 )) && rhachet_corrected=0
    rhachet_times+=("$rhachet_corrected")
  fi

  # progress indicator
  if (( i % 10 == 0 )); then
    echo "[phase 3] completed $i/$RUNS runs..."
  fi
done
echo "[phase 3] measurement complete"
echo ""

######################################################################
# phase 4: statistical analysis
######################################################################
echo "[phase 4] analyze: compute statistics..."

# calculate mean
calc_mean() {
  local -n arr=$1
  local sum=0
  for val in "${arr[@]}"; do
    sum=$((sum + val))
  done
  echo $((sum / ${#arr[@]}))
}

# calculate min
calc_min() {
  local -n arr=$1
  local min=${arr[0]}
  for val in "${arr[@]}"; do
    (( val < min )) && min=$val
  done
  echo "$min"
}

# calculate max
calc_max() {
  local -n arr=$1
  local max=${arr[0]}
  for val in "${arr[@]}"; do
    (( val > max )) && max=$val
  done
  echo "$max"
}

# calculate stddev (integer approximation)
calc_stddev() {
  local -n arr=$1
  local mean=$2
  local sum_sq=0
  local n=${#arr[@]}
  for val in "${arr[@]}"; do
    local diff=$((val - mean))
    sum_sq=$((sum_sq + diff * diff))
  done
  # integer sqrt approximation
  local variance=$((sum_sq / n))
  local stddev=0
  local guess=$((variance / 2 + 1))
  while (( guess * guess > variance )); do
    guess=$(( (guess + variance / guess) / 2 ))
  done
  echo "$guess"
}

# count outliers (values > 2 stddev from mean)
count_outliers() {
  local -n arr=$1
  local mean=$2
  local stddev=$3
  local threshold=$((stddev * 2))
  local count=0
  for val in "${arr[@]}"; do
    local diff=$((val - mean))
    (( diff < 0 )) && diff=$((-diff))
    (( diff > threshold )) && count=$((count + 1))
  done
  echo "$count"
}

# compute stats for command
cmd_mean=$(calc_mean rhachet_times)
cmd_min=$(calc_min rhachet_times)
cmd_max=$(calc_max rhachet_times)
cmd_stddev=$(calc_stddev rhachet_times "$cmd_mean")
cmd_outliers=$(count_outliers rhachet_times "$cmd_mean" "$cmd_stddev")

# compute baseline stats if available
if [ "$HAS_BASELINE" = true ]; then
  baseline_mean=$(calc_mean direct_times)
  baseline_min=$(calc_min direct_times)
  baseline_max=$(calc_max direct_times)
  baseline_stddev=$(calc_stddev direct_times "$baseline_mean")
  baseline_outliers=$(count_outliers direct_times "$baseline_mean" "$baseline_stddev")
  overhead=$((cmd_mean - baseline_mean))
else
  overhead=$cmd_mean
fi

######################################################################
# phase 5: report results
######################################################################

# determine pass/fail (compare mean time against threshold)
if [ "$cmd_mean" -lt "$THRESHOLD" ]; then
  passed=true
else
  passed=false
fi

# JSON output mode
if [ "$JSON_OUTPUT" = true ]; then
  if [ "$HAS_BASELINE" = true ]; then
    cat <<EOF
{
  "config": {
    "runs": $RUNS,
    "warmup": $WARMUP,
    "threshold": $THRESHOLD,
    "cmd": "$CMD",
    "baseline": "$BASELINE"
  },
  "results": {
    "baseline": {
      "mean": $baseline_mean,
      "min": $baseline_min,
      "max": $baseline_max,
      "stddev": $baseline_stddev,
      "outliers": $baseline_outliers
    },
    "cmd": {
      "mean": $cmd_mean,
      "min": $cmd_min,
      "max": $cmd_max,
      "stddev": $cmd_stddev,
      "outliers": $cmd_outliers
    },
    "overhead": $overhead,
    "shellBaseline": $shell_baseline
  },
  "passed": $passed
}
EOF
  else
    cat <<EOF
{
  "config": {
    "runs": $RUNS,
    "warmup": $WARMUP,
    "threshold": $THRESHOLD,
    "cmd": "$CMD"
  },
  "results": {
    "cmd": {
      "mean": $cmd_mean,
      "min": $cmd_min,
      "max": $cmd_max,
      "stddev": $cmd_stddev,
      "outliers": $cmd_outliers
    },
    "shellBaseline": $shell_baseline
  },
  "passed": $passed
}
EOF
  fi
  if [ "$passed" = true ]; then
    exit 0
  else
    exit 1
  fi
fi

# human-readable output mode
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  RESULTS                                                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-12s  %6s  %6s  %6s  %6s  %8s  ║\n" "" "mean" "min" "max" "stddev" "outliers"
echo "╠══════════════════════════════════════════════════════════════╣"
if [ "$HAS_BASELINE" = true ]; then
printf "║  %-12s  %5dms %5dms %5dms %5dms  %8d  ║\n" "baseline" "$baseline_mean" "$baseline_min" "$baseline_max" "$baseline_stddev" "$baseline_outliers"
fi
printf "║  %-12s  %5dms %5dms %5dms %5dms  %8d  ║\n" "cmd" "$cmd_mean" "$cmd_min" "$cmd_max" "$cmd_stddev" "$cmd_outliers"
if [ "$HAS_BASELINE" = true ]; then
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  %-12s  %5dms                                    ║\n" "overhead" "$overhead"
fi
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# check threshold
if [ "$passed" = true ]; then
  echo "✅ PASS: ${cmd_mean}ms < ${THRESHOLD}ms threshold"
  exit 0
else
  echo "❌ FAIL: ${cmd_mean}ms >= ${THRESHOLD}ms threshold"
  exit 1
fi
