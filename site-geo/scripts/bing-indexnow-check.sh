#!/usr/bin/env bash
# Bing Webmaster Tools + IndexNow readiness check for site-geo.
# Read-only: plain GETs against the site, never pings api.indexnow.org (that submits URLs).
# Output: one "CHECK: PASS|FAIL|UNKNOWN — detail" line per finding.
set -uo pipefail

usage() { echo "usage: $0 <url> [--key KEY] [--repo PATH]" >&2; exit 2; }

URL="" KEY="" REPO=""
while [ $# -gt 0 ]; do
  case "$1" in
    --key) [ $# -ge 2 ] || usage; KEY="$2"; shift 2 ;;
    --repo) [ $# -ge 2 ] || usage; REPO="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) [ -z "$URL" ] && URL="$1" || usage; shift ;;
  esac
done
[ -n "$URL" ] || usage
case "$URL" in http://*|https://*) ;; *) URL="https://$URL" ;; esac
ORIGIN="$(printf '%s' "$URL" | sed -E 's#^(https?://[^/]+).*#\1#')"
[ -z "$REPO" ] && REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$REPO" ] && [ ! -d "$REPO" ]; then echo "warning: --repo $REPO is not a directory; ignoring" >&2; REPO=""; fi

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
UA="Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
fetch() { curl -sL -m 15 -A "$UA" -o "$TMP/$2" -w '%{http_code}' "$1" 2>/dev/null || true; }  # 000 on network failure
KEY_RE='^[A-Za-z0-9-]{8,128}$'

echo "ORIGIN: $ORIGIN"
echo "REPO: ${REPO:-none}"

# --- Bing Webmaster Tools verification ------------------------------------
code="$(fetch "$ORIGIN/BingSiteAuth.xml" siteauth)"
if [ "$code" = 200 ] && grep -sqi '<user>' "$TMP/siteauth"; then
  echo "BING_SITEAUTH_XML: PASS — /BingSiteAuth.xml present"; via="file"
else
  echo "BING_SITEAUTH_XML: FAIL — HTTP $code or no <user> element"; via=""
fi

code="$(fetch "$URL" home)"
if grep -sqi 'msvalidate\.01' "$TMP/home"; then
  echo "BING_META_TAG: PASS — msvalidate.01 in raw HTML"; via="${via:+$via+}meta"
else
  echo "BING_META_TAG: FAIL — no msvalidate.01 meta in raw HTML (HTTP $code)"
fi

if [ -n "$via" ]; then
  echo "BING_VERIFIED: PASS — via $via"
else
  echo "BING_VERIFIED: UNKNOWN — no public trace; DNS CNAME or Google Search Console import leave none. Confirm in Bing Webmaster Tools"
fi

# --- robots.txt: Bingbot access + sitemap ---------------------------------
code="$(fetch "$ORIGIN/robots.txt" robots)"
if [ "$code" = 404 ]; then
  echo "BINGBOT_ALLOWED: PASS — no robots.txt (404), so everything is crawlable"
  echo "SITEMAP_IN_ROBOTS: FAIL — no robots.txt"
elif [ "$code" != 200 ]; then
  echo "BINGBOT_ALLOWED: UNKNOWN — robots.txt HTTP $code"
  echo "SITEMAP_IN_ROBOTS: FAIL — robots.txt HTTP $code"
else
  # Use the bingbot group if one exists, else the * group; blocked if it has "Disallow: /".
  verdict="$(tr -d '\r' < "$TMP/robots" | sed 's/#.*//' | awk '
    BEGIN { FS=":" }
    { k=tolower($1); gsub(/[ \t]/,"",k); v=$0; sub(/^[^:]*:[ \t]*/,"",v); sub(/[ \t]+$/,"",v) }
    k=="user-agent" { if (!inua) { bing=0; star=0 } inua=1; a=tolower(v); if (a=="bingbot") { bing=1; hasbing=1 } if (a=="*") star=1; next }
    k=="disallow" || k=="allow" { inua=0; if (k=="disallow" && v=="/") { if (bing) bblock=1; if (star) sblock=1 } }
    END { if (hasbing) print (bblock ? "blocked-bingbot" : "allowed-bingbot"); else print (sblock ? "blocked-star" : "allowed-star") }')"
  case "$verdict" in
    allowed-*) echo "BINGBOT_ALLOWED: PASS — ${verdict#allowed-} group" ;;
    blocked-*) echo "BINGBOT_ALLOWED: FAIL — Disallow: / in ${verdict#blocked-} group" ;;
  esac
  if grep -qi '^[[:space:]]*sitemap:' "$TMP/robots"; then
    echo "SITEMAP_IN_ROBOTS: PASS — $(grep -i '^[[:space:]]*sitemap:' "$TMP/robots" | head -1 | tr -d '\r' | sed 's/^[^:]*:[[:space:]]*//')"
  else
    echo "SITEMAP_IN_ROBOTS: FAIL — no Sitemap: line (submit the sitemap in BWT too)"
  fi
fi

# --- IndexNow key ----------------------------------------------------------
key_source="--key"
if [ -z "$KEY" ] && [ -n "$REPO" ]; then
  # IndexNow key file convention: {key}.txt whose content is exactly the key.
  while IFS= read -r f; do
    name="$(basename "$f" .txt)"
    printf '%s' "$name" | grep -Eq "$KEY_RE" || continue
    [ "$(tr -d '[:space:]' < "$f")" = "$name" ] && { KEY="$name"; key_source="${f#"$REPO"/}"; break; }
  done < <(find "$REPO" -maxdepth 3 -type f -name '*.txt' \
             -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' 2>/dev/null)
fi

if [ -z "$KEY" ]; then
  echo "INDEXNOW_KEY: UNKNOWN — no key supplied or found in repo; ask the user for it (re-run with --key)"
else
  code="$(fetch "$ORIGIN/$KEY.txt" keyfile)"
  body="$(tr -d '[:space:]' 2>/dev/null < "$TMP/keyfile")"
  if [ "$code" = 200 ] && [ "$body" = "$KEY" ]; then
    echo "INDEXNOW_KEY: PASS — $ORIGIN/$KEY.txt serves the key (from $key_source)"
  elif [ "$code" = 200 ]; then
    echo "INDEXNOW_KEY: FAIL — $ORIGIN/$KEY.txt returns 200 but body does not match the key"
  else
    echo "INDEXNOW_KEY: FAIL — $ORIGIN/$KEY.txt HTTP $code (key from $key_source; not deployed?)"
  fi
fi

# --- IndexNow submitter ------------------------------------------------------
server="$(curl -sI -m 15 -A "$UA" "$ORIGIN/" 2>/dev/null | tr -d '\r' | grep -i '^server:' | head -1 | sed 's/^[^:]*:[[:space:]]*//')"
cf_note=""
printf '%s' "$server" | grep -qi cloudflare && cf_note=" (site is on Cloudflare: Crawler Hints can submit via IndexNow; check the dashboard)"

if [ -n "$REPO" ]; then
  hits="$(grep -rIil --exclude-dir={node_modules,.git,.next,dist,build} \
            --exclude='*.lock' --exclude='package-lock.json' --exclude='*.md' \
            --exclude='bing-indexnow-check.sh' \
            -E 'api\.indexnow\.org|https?://[a-z0-9.-]+/indexnow' "$REPO" 2>/dev/null | sed "s#^$REPO/##" | head -5 | paste -sd, -)"
  if [ -n "$hits" ]; then
    echo "INDEXNOW_SUBMITTER: PASS — IndexNow endpoint referenced in $hits (confirm it fires on publish)"
  else
    echo "INDEXNOW_SUBMITTER: FAIL — no IndexNow submission code in repo$cf_note"
  fi
else
  echo "INDEXNOW_SUBMITTER: UNKNOWN — no repo to inspect$cf_note"
fi
