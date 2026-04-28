#!/bin/bash

set -e
trap "kill 0" EXIT

fuser -k 8001/tcp 3000/tcp 2>/dev/null || true

rm -f package-lock.json
rm -f frontend/pnpm-lock.yaml
rm -rf frontend/.next

if command -v python3 &>/dev/null; then PYTHON_CMD="python3"; else PYTHON_CMD="python"; fi

echo "--- Pre-run Configuration ---"

set +e
read -p "Update Backend dependencies (pip install)? (y/n): " confirm_backend
read -p "Update Frontend dependencies (pnpm install)? (y/n): " confirm_frontend
set -e

echo "--- System Check ---"

APT_UPDATED=false
check_apt_dependency() {
    local cmd_check="$1"
    local pkg_name="$2"
    local apt_pkg="$3"
    
    if ! eval "$cmd_check" &> /dev/null; then
        if command -v apt &> /dev/null; then
            set +e
            read -p "$pkg_name not found. Install via 'apt'? (y/n): " confirm
            set -e
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                if [ "$APT_UPDATED" = "false" ]; then
                    sudo apt update
                    APT_UPDATED=true
                fi
                sudo apt install -y $apt_pkg
            fi
        fi
    fi
}

check_apt_dependency "$PYTHON_CMD -c 'import venv'" "Python venv" "python3-venv"
check_apt_dependency "command -v node" "Node.js" "nodejs"
check_apt_dependency "command -v curl" "curl" "curl"

if ! command -v pnpm &> /dev/null; then
    sudo npm install -g pnpm
fi

echo "--- Execution ---"

cd backend
if [ ! -d "venv" ]; then $PYTHON_CMD -m venv venv; fi
source venv/bin/activate || source venv/Scripts/activate

if [[ "$confirm_backend" =~ ^[Yy]$ ]]; then
    pip install -r requirements.txt
fi

PYTHONUNBUFFERED=1 uvicorn main:app --reload --port 8001 2>&1 | tee backend.log &
cd ..

if [[ "$confirm_frontend" =~ ^[Yy]$ ]]; then
    pnpm install
fi

cd frontend
pnpm run dev > frontend.log 2>&1 &

(
  max_attempts=60
  attempts=0
  until curl -s http://localhost:3000 > /dev/null; do
    sleep 1
    attempts=$((attempts+1))
    if [ $attempts -ge $max_attempts ]; then
        exit 1
    fi
  done
  [ -n "$DISPLAY" ] && command -v xdg-open &> /dev/null && xdg-open http://localhost:3000
) &

wait