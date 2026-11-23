#!/bin/bash
# Small helper for a UX walkthrough of the Jigx app on the booted iOS simulator.
# Needs Xcode (xcrun simctl) and idb (brew install idb-companion; pip install fb-idb).
# See references/device-review.md.
#
#   sim.sh shot <name> [dir]          screenshot + on-screen elements (label, x, y, w, h in points)
#   sim.sh tap <x> <y> [wait]         tap, then wait (default 2 s)
#   sim.sh swipe <x1> <y1> <x2> <y2>  swipe
#   sim.sh text "<text>"              type into the focused field
#   sim.sh textsize <size>            set text size and restart the app (large = default)
#   sim.sh restart                    restart the Jigx app
set -euo pipefail
APP=${JIGX_APP_ID:-com.jigx.frontline}
UDID=$(xcrun simctl list devices booted | grep -m1 -oE '[0-9A-F-]{36}' || true)
[ -n "$UDID" ] || { echo "No booted simulator. Open one in Xcode/Simulator first." >&2; exit 2; }

restart() { xcrun simctl terminate "$UDID" "$APP" 2>/dev/null || true; xcrun simctl launch "$UDID" "$APP" >/dev/null; sleep 10; }

case "${1:-}" in
  shot)
    dir=${3:-.}; mkdir -p "$dir"
    xcrun simctl io "$UDID" screenshot "$dir/$2.png" >/dev/null 2>&1
    sips -Z 1000 "$dir/$2.png" --out "$dir/$2.png" >/dev/null
    echo "$dir/$2.png"
    idb ui describe-all --udid "$UDID" | python3 -c '
import json, sys
for e in json.load(sys.stdin):
    label = e.get("AXLabel") or e.get("AXValue") or ""
    if label and e.get("type") != "Application":
        f = e["frame"]
        print(e.get("type", "")[:7], repr(label[:70]), int(f["x"]), int(f["y"]), int(f["width"]), int(f["height"]))'
    ;;
  tap) idb ui tap "$2" "$3" --udid "$UDID"; sleep "${4:-2}" ;;
  swipe) idb ui swipe "$2" "$3" "$4" "$5" --udid "$UDID" --duration 0.3; sleep 1.5 ;;
  text) idb ui text "$2" --udid "$UDID"; sleep 1 ;;
  textsize) xcrun simctl ui "$UDID" content_size "$2"; restart ;;
  restart) restart ;;
  *) sed -n '2,12p' "$0"; exit 1 ;;
esac
