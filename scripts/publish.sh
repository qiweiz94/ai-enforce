#!/bin/bash
# Publish ai-enforce packages to npm
# Usage: AI_ENFORCE_OTP=123456 bash scripts/publish.sh
set -euo pipefail

OTP="${AI_ENFORCE_OTP:-}"
if [ -z "$OTP" ]; then
  echo "Usage: AI_ENFORCE_OTP=<2fa-code> bash scripts/publish.sh"
  echo "Get the 2FA code from your authenticator app"
  exit 1
fi

echo "Publishing @ai-enforce/core..."
npm publish --workspace=packages/core --access public --otp="$OTP"

echo "Publishing ai-enforce..."
npm publish --workspace=packages/cli --access public --otp="$OTP"

echo "Publishing @ai-enforce/mcp-server..."
npm publish --workspace=packages/mcp-server --access public --otp="$OTP"

echo ""
echo "✅ All packages published!"
echo ""
echo "Test: npm install -g ai-enforce && ai-enforce --version"
