#!/usr/bin/env bash
#
# Ports the phone app's pages onto the website.
#
# The Android assets are the single source of truth for the student experience.
# This script copies them into their web routes and applies the only three kinds
# of change the web needs:
#
#   1. route rewrites  — lesson.html -> /learn/, home.html -> /sdashboard/, etc.
#   2. pointer mode    — the phone build hardcodes isMobileMode = true; the web
#                        detects it, so a mouse gets the desktop drawing path
#   3. one extra <link>/<script> pair pulling in the desktop layer
#
# Everything else that makes the site look like a site lives in
# assets/thelo-web.css and assets/thelo-web.js. Nothing is hand-edited in the
# ported files, so re-running this after an Android change is always safe.
#
# Usage:  ./tools/port-from-app.sh [path-to-android-assets]
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${1:-$HERE/../thelo/app/src/main/assets}"

[ -d "$SRC" ] || { echo "Android assets not found at: $SRC" >&2; exit 1; }
echo "source: $SRC"
echo "site:   $HERE"
echo

port () {
    local infile="$1" outfile="$2" label="$3"
    mkdir -p "$(dirname "$outfile")"

    sed \
        -e 's|lesson\.html?lessonFile=|/learn/?lessonFile=|g' \
        -e "s|url('fonts/|url('/fonts/|g" \
        -e 's|url("fonts/|url("/fonts/|g' \
        -e 's|url(fonts/|url(/fonts/|g' \
        -e 's|href="scan\.html"|href="/scan/"|g' \
        -e 's|href="home\.html?view=|href="/sdashboard/?view=|g' \
        -e 's|href="home\.html"|href="/sdashboard/"|g' \
        -e "s|location\.href *= *'home\.html'|location.href = '/sdashboard/'|g" \
        -e "s|location\.href='home\.html'|location.href='/sdashboard/'|g" \
        "$infile" > "$outfile"

    # --- pointer mode -----------------------------------------------------
    # The phone build forces mobile. On the web, a real pointer must get the
    # desktop drawing path (mouse events + captureCanvas), which is still all
    # there in the code -- it is simply gated behind this one flag.
    perl -0pi -e 's{(function checkMobileMode\(\) \{\n)(\s*)// Mobile-only mode: always force mobile\.\n\s*isMobileMode = true;}
{$1$2// WEB PORT: the phone build hardcodes true here. On a desktop browser we\n$2// want the mouse path, so decide from the pointing device and the width.\n$2isMobileMode = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;}s' "$outfile"

    # --- desktop layer ----------------------------------------------------
    perl -0pi -e 's{</head>}{    <link rel="stylesheet" href="/assets/thelo-web.css">\n</head>}' "$outfile"
    perl -0pi -e 's{</body>}{<script src="/assets/thelo-web.js"></script>\n</body>}' "$outfile"

    printf "  %-14s %-22s %s bytes\n" "$label" "${outfile#$HERE/}" "$(wc -c < "$outfile" | tr -d ' ')"
}

port "$SRC/home.html"   "$HERE/sdashboard/index.html" "dashboard"
port "$SRC/lesson.html" "$HERE/learn/index.html"      "lesson"
port "$SRC/scan.html"   "$HERE/scan/index.html"       "scan"

echo
echo "--- verification ---"
fail=0
check () {
    local file="$1" pattern="$2" desc="$3" want="$4"
    local n; n=$(grep -c "$pattern" "$file" 2>/dev/null || true)
    if [ "$want" = "gone" ] && [ "$n" -ne 0 ]; then
        echo "  FAIL  $desc still present in ${file##*/} ($n)"; fail=$((fail+1))
    elif [ "$want" = "present" ] && [ "$n" -eq 0 ]; then
        echo "  FAIL  $desc missing from ${file##*/}"; fail=$((fail+1))
    else
        echo "  ok    $desc  (${file##*/})"
    fi
}

for f in "$HERE/sdashboard/index.html" "$HERE/learn/index.html" "$HERE/scan/index.html"; do
    check "$f" 'thelo-web.css' 'desktop stylesheet' present
    check "$f" 'thelo-web.js'  'desktop script'     present
    check "$f" 'href="home\.html"' 'raw home.html link' gone
    check "$f" 'lesson\.html?lessonFile=' 'raw lesson.html link' gone
done
check "$HERE/learn/index.html" 'isMobileMode = true;' 'hardcoded mobile flag' gone
check "$HERE/learn/index.html" 'pointer: coarse' 'pointer detection' present

# The Armenian faces are bundled beside the HTML in the APK, so the app refers to
# them as fonts/... . Served from /learn/ that resolves to /learn/fonts/ and 404s,
# silently dropping the page to a fallback face. They must be root-absolute.
for f in "$HERE/sdashboard/index.html" "$HERE/learn/index.html" "$HERE/scan/index.html"; do
    check "$f" "url('fonts/" 'page-relative font path' gone
done
for face in Montserratarm-Regular.otf Montserratarm-ExtraBold.otf Montserratarm-SemiBold.otf; do
    if [ -f "$HERE/fonts/$face" ]; then echo "  ok    /fonts/$face present"
    else echo "  FAIL  /fonts/$face missing from the site"; fail=$((fail+1)); fi
done

echo
[ "$fail" -eq 0 ] || { echo "$fail check(s) failed" >&2; exit 1; }
echo "Port complete."
