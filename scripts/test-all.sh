#!/bin/bash
# AmbientTV Full Integration Test Script
# Tests all API endpoints, web player, and security features

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0

function check() {
  if [ $1 -eq 0 ]; then
    echo "  ✅ $2"
    ((PASS++))
  else
    echo "  ❌ $2"
    ((FAIL++))
  fi
}

function check_str() {
  if [ "$1" = "$2" ]; then
    echo "  ✅ $3"
    ((PASS++))
  else
    echo "  ❌ $3 (expected: $2, got: $1)"
    ((FAIL++))
  fi
}

echo "🧪 AmbientTV Full Integration Test"
echo "===================================="

# 1. Health check
echo "1. Health check"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)
check_str "$RESPONSE" "200" "Health endpoint returns 200"

# 2. Catalog (no auth required)
echo "2. Catalog API"
RESPONSE=$(curl -s $BASE_URL/api/catalog | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
[ -n "$RESPONSE" ] && [ "$RESPONSE" -gt 0 ] 2>/dev/null
check $? "Catalog returns categories ($RESPONSE categories)"

# 3. Auth flow
echo "3. Auth flow"
LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login -H "Content-Type: application/json" -d '{"email":"sanitizetest@example.com","password":"testpass123"}' -c /tmp/cookies.txt -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$LOGIN" | grep "HTTP_CODE:" | cut -d: -f2)
check_str "$HTTP_CODE" "200" "Login successful"

# 4. Favorites CRUD
echo "4. Favorites CRUD"
ADD=$(curl -s -X POST $BASE_URL/api/user/favorites -H "Content-Type: application/json" -b /tmp/cookies.txt -d '{"video_url":"https://example.com/test.mp4","audio_url":"https://example.com/test.mp3","title":"Test","category_id":"nature"}' -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$ADD" | grep "HTTP_CODE:" | cut -d: -f2)
check_str "$HTTP_CODE" "200" "Add favorite"

LIST=$(curl -s $BASE_URL/api/user/favorites -b /tmp/cookies.txt -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$LIST" | grep "HTTP_CODE:" | cut -d: -f2)
check_str "$HTTP_CODE" "200" "List favorites"

# 5. XSS check — test NEW data (after double-sanitize fix)
echo "5. XSS Sanitization"
XSS_ADD=$(curl -s -X POST $BASE_URL/api/user/favorites -H "Content-Type: application/json" -b /tmp/cookies.txt -d '{"video_url":"https://example.com/xss2.mp4","audio_url":"https://example.com/xss2.mp3","title":"<b>Bold</b>","category_id":"nature"}' -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$XSS_ADD" | grep "HTTP_CODE:" | cut -d: -f2)
if [ "$HTTP_CODE" = "200" ]; then
  XSS_LIST=$(curl -s $BASE_URL/api/user/favorites -b /tmp/cookies.txt)
  echo "$XSS_LIST" | grep -q "\u0026lt;b\u0026gt;" 2>/dev/null
  HAS_SINGLE=$?
  echo "$XSS_LIST" | grep -q "\u0026amp;lt;" 2>/dev/null
  HAS_DOUBLE=$?
  if [ "$HAS_SINGLE" -eq 0 ] && [ "$HAS_DOUBLE" -ne 0 ]; then
    check 0 "XSS payload sanitized once (single escape, no double)"
  else
    check 1 "XSS sanitization — unexpected result"
  fi
else
  check 1 "XSS test failed (HTTP $HTTP_CODE)"
fi

# 6. URL validation
echo "6. URL Validation"
BAD_URL=$(curl -s -X POST $BASE_URL/api/user/favorites -H "Content-Type: application/json" -b /tmp/cookies.txt -d '{"video_url":"javascript:alert(1)","audio_url":"https://example.com/test.mp3","title":"Bad","category_id":"nature"}' -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$BAD_URL" | grep "HTTP_CODE:" | cut -d: -f2)
check_str "$HTTP_CODE" "400" "Malicious URL rejected (HTTP $HTTP_CODE)"

# 7. Web player check (player.html page)
echo "7. Web Player"
HTML=$(curl -s $BASE_URL/player.html | grep -c "player-core.js")
[ "$HTML" -gt 0 ]
check $? "Player modules loaded ($HTML refs in player.html)"

# 8. Backup check
echo "8. SQLite Backup"
[ -f /root/.openclaw/workspace/AmbientTV/backend/backups/*.gz ]
check $? "Backup archive exists"

# 9. Search endpoints (protected — require auth)
echo "9. Search endpoints"
SEARCH=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/search/archive?query=nature)
check_str "$SEARCH" "401" "Search protected without auth (returns 401)"
AUTH_SEARCH=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/search/archive?query=nature -b /tmp/cookies.txt)
check_str "$AUTH_SEARCH" "200" "Search works with auth (returns 200)"

echo ""
echo "===================================="
echo "Results: $PASS passed, $FAIL failed"
if [ $FAIL -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️ Some tests failed"
  exit 1
fi
