#!/usr/bin/env bash
# Put cached Chromium dependency archives where apt looks for already-downloaded packages.
# apt reuses a file in /var/cache/apt/archives when only its name and size match, so each cached file is
# copied only if its SHA256 is listed in the package index apt has just fetched (signed by Ubuntu), under
# the name apt derives from that index entry. Anything else is left for apt to download as before.
set -euo pipefail

cache_dir="$1"
shopt -s nullglob
cached=("$cache_dir"/*.deb)
if [ ${#cached[@]} -eq 0 ]; then
  echo "No cached archives; apt downloads every package."
  exit 0
fi

sudo apt-get update -qq

wanted="$(mktemp)"
matches="$(mktemp)"
sha256sum "${cached[@]}" > "$wanted"
# shellcheck disable=SC2016 # $(FILENAME) is apt's placeholder, not a shell expansion
apt-get indextargets --format '$(FILENAME)' 'Created-By: Packages' | while read -r index; do
  if [ -f "$index" ]; then
    /usr/lib/apt/apt-helper cat-file "$index"
    echo
  fi
done | awk '
  NR == FNR { path[$1] = $2; next }
  /^Package: / { p = $2 }
  /^Version: / { v = $2 }
  /^Architecture: / { a = $2 }
  /^SHA256: / { h = $2 }
  /^$/ {
    if (h in path) { gsub(":", "%3a", v); print path[h], p "_" v "_" a ".deb"; delete path[h] }
    p = v = a = h = ""
  }
  END { for (h in path) print "Not in the package index, left for apt to download: " path[h] > "/dev/stderr" }' "$wanted" - > "$matches"

while read -r deb name; do
  sudo cp "$deb" "/var/cache/apt/archives/$name"
done < "$matches"
echo "Seeded $(wc -l < "$matches") of ${#cached[@]} cached archives; apt downloads the rest."
rm -f "$wanted" "$matches"
