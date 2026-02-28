#!/bin/bash
# ═══════════════════════════════════════════════════════
# ATlast Docker Stack Smoke Test
# Validates the full stack is running and responding.
# Usage: bash scripts/docker-smoke-test.sh
# ═══════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ──────────────────────────────────────
COMPOSE_FILE="docker/docker-compose.yml"
BASE_URL="http://localhost"
MAX_WAIT_SECONDS=90
POLL_INTERVAL=5

# ── Color output ───────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# ── Helper functions ───────────────────────────────────

log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; PASS=$((PASS + 1)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; FAIL=$((FAIL + 1)); }

check_status() {
    local description="$1"
    local url="$2"
    local expected_status="$3"

    local actual_status
    actual_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

    if [ "$actual_status" = "$expected_status" ]; then
        log_pass "$description → HTTP $actual_status (expected $expected_status)"
    else
        log_fail "$description → HTTP $actual_status (expected $expected_status) — URL: $url"
    fi
}

check_json_field() {
    local description="$1"
    local url="$2"
    local field="$3"

    local response
    response=$(curl -s --max-time 10 "$url" 2>/dev/null || echo "{}")

    # Use node to parse JSON — available on any system running this stack.
    local value
    value=$(node -e "
        try {
            const data = JSON.parse(process.argv[1]);
            const keys = process.argv[2].split('.');
            let val = data;
            for (const key of keys) { val = val[key]; }
            process.stdout.write(val !== undefined ? 'found' : 'missing');
        } catch (e) {
            process.stdout.write('error');
        }
    " "$response" "$field" 2>/dev/null || echo "error")

    if [ "$value" = "found" ]; then
        log_pass "$description → field '$field' present"
    else
        log_fail "$description → field '$field' missing or response unparseable"
    fi
}

wait_for_healthy() {
    local service_name="$1"
    local url="$2"
    local elapsed=0

    log_info "Waiting for $service_name to become healthy (up to ${MAX_WAIT_SECONDS}s)..."

    while [ $elapsed -lt $MAX_WAIT_SECONDS ]; do
        local actual_status
        actual_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")

        # Accept 200 (health ok) or 401 (auth endpoint, service is up) as "alive"
        if [ "$actual_status" = "200" ] || [ "$actual_status" = "401" ]; then
            log_info "$service_name is responding (HTTP $actual_status) after ${elapsed}s"
            return 0
        fi

        sleep $POLL_INTERVAL
        elapsed=$((elapsed + POLL_INTERVAL))
        log_info "  ... still waiting (${elapsed}s / ${MAX_WAIT_SECONDS}s, HTTP $actual_status)"
    done

    echo -e "${RED}[ERROR]${NC} $service_name did not become healthy within ${MAX_WAIT_SECONDS}s"
    return 1
}

show_logs_for_service() {
    local service="$1"
    echo ""
    echo -e "${YELLOW}═══ Logs for: $service ═══${NC}"
    docker compose -f "$COMPOSE_FILE" logs --tail=30 "$service" 2>/dev/null || true
    echo ""
}

# ── Main ────────────────────────────────────────────────

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   ATlast Docker Stack Smoke Test          ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Build and start the stack ──────────────────
log_info "Building and starting the stack..."
docker compose -f "$COMPOSE_FILE" up --build -d

echo ""
log_info "Stack started. Waiting for services to initialize..."
echo ""

# ── Step 2: Wait for API health endpoint ───────────────
if ! wait_for_healthy "API" "$BASE_URL/api/health"; then
    echo ""
    echo -e "${RED}API did not start. Showing logs for debugging:${NC}"
    show_logs_for_service "api"
    show_logs_for_service "database"
    show_logs_for_service "redis"
    exit 1
fi

echo ""
echo -e "${YELLOW}─── Running endpoint checks ───${NC}"
echo ""

# ── Step 3: API health check ───────────────────────────
check_status \
    "GET /api/health → 200 OK" \
    "$BASE_URL/api/health" \
    "200"

check_json_field \
    "GET /api/health → has 'status' field" \
    "$BASE_URL/api/health" \
    "status"

# ── Step 4: Auth endpoints (unauthenticated) ───────────

# 401 proves: API is running AND auth middleware is working correctly.
# A missing session returning 401 is the expected, correct behavior.
check_status \
    "GET /api/auth/session → 401 (no session cookie, auth middleware active)" \
    "$BASE_URL/api/auth/session" \
    "401"

check_status \
    "GET /api/auth/client-metadata.json → 200" \
    "$BASE_URL/api/auth/client-metadata.json" \
    "200"

check_json_field \
    "GET /api/auth/client-metadata.json → has 'client_id' field" \
    "$BASE_URL/api/auth/client-metadata.json" \
    "client_id"

check_status \
    "GET /api/auth/jwks → 200" \
    "$BASE_URL/api/auth/jwks" \
    "200"

check_json_field \
    "GET /api/auth/jwks → has 'keys' field" \
    "$BASE_URL/api/auth/jwks" \
    "keys"

# ── Step 5: Frontend is served ─────────────────────────
check_status \
    "GET / → 200 (frontend HTML served by nginx)" \
    "$BASE_URL/" \
    "200"

# ── Step 6: Docker service health summary ──────────────
echo ""
echo -e "${YELLOW}─── Docker service status ───${NC}"
docker compose -f "$COMPOSE_FILE" ps
echo ""

# ── Step 7: Show results ───────────────────────────────
echo -e "${YELLOW}─── Results ────────────────────────────────────${NC}"
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${RED}Smoke test FAILED ($FAIL checks failed).${NC}"
    echo ""
    echo "Showing logs for potentially failing services:"

    for service in api worker database redis frontend; do
        STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format "{{.Service}} {{.Status}}" 2>/dev/null \
            | grep "^$service " | awk '{print $2}' || echo "unknown")
        if [[ "$STATUS" != *"Up"* ]] || [[ "$STATUS" == *"unhealthy"* ]]; then
            show_logs_for_service "$service"
        fi
    done

    exit 1
else
    echo -e "${GREEN}All smoke tests passed!${NC}"
    echo ""
    echo "The stack is running. Access the app at: $BASE_URL"
    exit 0
fi
