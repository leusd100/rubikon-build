#!/usr/bin/env bash
# Keep the archives apt installed from (seeded and downloaded) for the next job and print a cache key
# suffix derived from their file names, or nothing when apt needed no archives at all.
set -euo pipefail

cache_dir="$1"
mkdir -p "$cache_dir"
rm -f "$cache_dir"/*.deb
shopt -s nullglob
debs=(/var/cache/apt/archives/*.deb)
if [ ${#debs[@]} -eq 0 ]; then
  echo "No archives to keep." >&2
  exit 0
fi
cp "${debs[@]}" "$cache_dir/"
echo "Keeping ${#debs[@]} archives ($(du -sh "$cache_dir" | cut -f1))." >&2
(cd "$cache_dir" && printf '%s\n' *.deb | LC_ALL=C sort | sha256sum | cut -c1-16)
