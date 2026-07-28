#!/bin/bash
set -e

echo "ai-enforce — Installing..."

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin)  OS="macos" ;;
  Linux)   OS="linux" ;;
  *)       echo "Unsupported OS: $OS"; exit 1 ;;
esac

echo "  Detected: $OS ($ARCH)"

# Check for Node.js
if ! command -v node &>/dev/null; then
  echo "  Node.js is required. Install it from https://nodejs.org"
  echo "  Or use: brew install node"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "  Node.js 18+ is required. Current: $(node -v)"
  exit 1
fi

echo "  Node.js $(node -v) ✓"

# Install via npm
npm install -g ai-enforce 2>&1 | tail -3

echo ""
echo "  ai-enforce installed successfully!"
echo ""
echo "  Quick start:"
echo "    cd your-project"
echo "    ai-enforce init --hooks"
echo "    ai-enforce check --ci"
echo ""
