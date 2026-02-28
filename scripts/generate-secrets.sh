#!/bin/bash
# ═══════════════════════════════════════════════════════
# ATlast Secret Generator
# Generates all required environment variable values.
# Usage: bash scripts/generate-secrets.sh
# ═══════════════════════════════════════════════════════

set -euo pipefail

echo "# ═══════════════════════════════════════════════════"
echo "# ATlast generated secrets — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "# Copy these values into docker/.env"
echo "# ═══════════════════════════════════════════════════"
echo ""

echo "# Database password (32 bytes of randomness, hex-encoded)"
echo "DB_PASSWORD=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
echo ""

echo "# Token encryption key (32 bytes of randomness, hex-encoded)"
echo "TOKEN_ENCRYPTION_KEY=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
echo ""

echo "# Generate OAUTH_PRIVATE_KEY separately (requires openssl):"
echo "# Run the following command, then paste the output as OAUTH_PRIVATE_KEY"
echo "# Replace actual newlines with \\n for the .env file."
echo "#"
echo "# openssl ecparam -genkey -name prime256v1 -noout | openssl pkcs8 -topk8 -nocrypt"
echo ""

echo "# CLOUDFLARE_TUNNEL_TOKEN: obtain from https://one.dash.cloudflare.com"
echo "# Zero Trust → Access → Tunnels → Create a tunnel → copy the token"
