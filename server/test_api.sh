#!/bin/bash
# Full GMIS CRM API Test Script
BASE="http://127.0.0.1:3001"
PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  local expect="$3"
  if echo "$result" | grep -q "$expect"; then
    echo "✅ $name"
    PASS=$((PASS+1))
  else
    echo "❌ $name => $result"
    FAIL=$((FAIL+1))
  fi
}

echo "=============================="
echo " GMIS CRM - System Health Check"
echo "=============================="

# 1. Stats API
R=$(curl -s "$BASE/api/stats")
check "GET /api/stats" "$R" "totalLeads"

# 2. Leads API
R=$(curl -s "$BASE/api/leads")
check "GET /api/leads" "$R" "\[\|{\"id\""

# 3. Visits API
R=$(curl -s "$BASE/api/visits")
check "GET /api/visits" "$R" "\[\|{\"id\""

# 4. Messages API
R=$(curl -s "$BASE/api/messages")
check "GET /api/messages" "$R" "\[\|{\"id\""

# 5. Users API
R=$(curl -s "$BASE/api/users")
check "GET /api/users" "$R" "admin\|email\|{\"id\""

# 6. Auto-replies API
R=$(curl -s "$BASE/api/auto-replies")
check "GET /api/auto-replies" "$R" "\[\|{\"id\""

# 7. Settings - Facebook
R=$(curl -s "$BASE/api/settings/facebook")
check "GET /api/settings/facebook" "$R" "connected"

# 8. Settings - WhatsApp
R=$(curl -s "$BASE/api/settings/whatsapp")
check "GET /api/settings/whatsapp" "$R" "connected"

# 9. Settings - AI
R=$(curl -s "$BASE/api/settings/ai")
check "GET /api/settings/ai" "$R" "autoReply\|{}"

# 10. Login API
R=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmis.edu","password":"123456"}')
check "POST /api/auth/login" "$R" "token"

# 11. Webhook GET verification
R=$(curl -s "$BASE/webhook?hub.mode=subscribe&hub.verify_token=&hub.challenge=testchallenge")
check "GET /webhook (verify)" "$R" "testchallenge\|403\|400"

# 12. Frontend Static Files
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/")
check "GET / (Frontend)" "$R" "200"

# 13. API 404 behavior (non-existent route)
R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/nonexistent")
check "GET /api/nonexistent -> 404" "$R" "404"

echo "=============================="
TOTAL=$((PASS+FAIL))
echo " Results: $PASS/$TOTAL passed"
PCT=$((PASS * 100 / TOTAL))
echo " System Health: $PCT%"
echo "=============================="
