#!/usr/bin/env bash
# ==============================================================================
# Zoop Daemon (zoopd) System Service Installer
# Installs zoopd as a privileged background system daemon so desktop users
# can connect without requiring sudo.
# ==============================================================================

set -euo pipefail

echo "==> Zoop System Service Installer"

if [[ $EUID -ne 0 ]]; then
   echo "Error: This script must be run as root (use sudo ./scripts/install_service.sh)"
   exit 1
fi

BIN_SOURCE="./bin/zoopd"
if [[ ! -f "$BIN_SOURCE" ]]; then
    echo "==> Building zoopd binary..."
    go build -o bin/zoopd ./cmd/zoopd
fi

echo "==> Installing zoopd service..."
"$BIN_SOURCE" service install

echo ""
echo "==> Verifying service status..."
"$BIN_SOURCE" service status

echo ""
echo "✓ Installation complete. You can now launch Zoop Desktop as a standard user!"
