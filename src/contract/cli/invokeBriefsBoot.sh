#!/bin/bash

# 🥾 boot context from briefs

# Function to print stats
print_stats() {
  echo "#####################################################"
  echo "#####################################################"
  echo "#####################################################"
  echo "## began:stats"
  echo "#####################################################"
  echo ""
  echo "  quant"
  echo "    ├── files = $file_count"
  echo "    └── chars = $char_count"
  echo ""
  echo "  treestruct"
  tree -l .briefs | sed 's/ -> .*$//' | sed 's/^/    /'
  echo ""
  echo "#####################################################"
  echo "## ended:stats"
  echo "#####################################################"
  echo "#####################################################"
  echo "#####################################################"
  echo ""
}

# Count files and characters
file_count=$(find -L .briefs/mechanic -type f | wc -l)
char_count=$(find -L .briefs/mechanic -type f -exec cat {} \; | wc -c)

# Print stats header
print_stats

# Iterate through each file in .briefs/mechanic/
for filepath in .briefs/mechanic/*; do
  # Skip if not a file (e.g., directories)
  if [ ! -f "$filepath" ]; then
    continue
  fi

  echo "#####################################################"
  echo "#####################################################"
  echo "#####################################################"
  echo "## began:$filepath"
  echo "#####################################################"
  echo ""
  cat "$filepath" | sed 's/^/  /'
  echo ""
  echo "#####################################################"
  echo "## ended:$filepath"
  echo "#####################################################"
  echo "#####################################################"
  echo "#####################################################"
  echo ""
done

# Print stats footer
print_stats
