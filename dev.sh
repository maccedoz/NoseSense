#!/bin/bash

# Stops the script immediately if any critical command fails
set -e

# Kills all child processes when the main script (or terminal) exits
trap "kill 0" EXIT

echo "Cleaning up old processes stuck on ports..."
# Using || true to prevent script failure if psmisc (fuser) is not installed or no process is found
fuser -k 8001/tcp 3000/tcp 2>/dev/null || true

APT_UPDATED=false

check_apt_dependency() {
    local cmd_check="$1"
    local pkg_name="$2"
    local apt_pkg="$3"
    
    if ! eval "$cmd_check" &> /dev/null; then
        set +e
        read -p "$pkg_name is missing. Would you like to download and install it now via 'apt'? (y/n): " confirm
        set -e
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            echo "Installing $pkg_name..."
            if [ "$APT_UPDATED" = "false" ]; then
                sudo apt update
                APT_UPDATED=true
            fi
            sudo apt install -y $apt_pkg
        else
            echo "Skipped $pkg_name installation."
        fi
    fi
}

echo "Checking system dependencies..."

check_apt_dependency "command -v python3 && python3 -c 'import venv'" "Python3 & venv" "python3 python3-venv"
check_apt_dependency "command -v node && command -v npm" "Node.js & NPM" "nodejs npm"
check_apt_dependency "command -v curl" "curl" "curl"

if ! command -v pnpm &> /dev/null; then
    set +e
    read -p "pnpm is missing. Would you like to download and install it now via 'npm'? (y/n): " confirm_pnpm
    set -e
    if [[ "$confirm_pnpm" =~ ^[Yy]$ ]]; then
        echo "Installing pnpm..."
        sudo npm install -g pnpm
    else
        echo "Skipped pnpm installation."
    fi
fi

echo "=========================================================="

# 2. Backend Setup
echo "Setting up Backend..."
if [ ! -d "backend" ]; then
    echo "Error: Directory 'backend' does not exist. Did you run the script from the correct folder?"
    exit 1
fi
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

set +e
read -p "Would you like to download/update Backend dependencies (pip install)? (y/n): " confirm_backend
set -e

if [[ "$confirm_backend" =~ ^[Yy]$ ]]; then
    echo "Downloading Python requirements..."
    pip install -r requirements.txt
else
    echo "Skipping Python requirements download..."
fi

echo "Starting FastAPI on port 8001 (logs displaying here AND saved to backend/backend.log)..."
PYTHONUNBUFFERED=1 uvicorn main:app --reload --port 8001 2>&1 | tee backend.log &

# 3. Frontend Setup
echo "Setting up Frontend..."
cd ../frontend

set +e
read -p "Would you like to download/update Frontend dependencies (pnpm install)? (y/n): " confirm_frontend
set -e

if [[ "$confirm_frontend" =~ ^[Yy]$ ]]; then
    echo "Clearing Next.js cache..."
    rm -rf .next
    echo "Downloading web project dependencies..."
    pnpm install
else
    echo "Skipping pnpm install..."
fi

echo "Starting Next.js on port 3000 (logs saved to frontend/frontend.log)..."
pnpm run dev > frontend.log 2>&1 &

# 4. Finalization Watcher
(
  echo "Waiting for the frontend to go online..."
  max_attempts=60
  attempts=0
  
  until curl -s http://localhost:3000 > /dev/null; do
    sleep 1
    attempts=$((attempts+1))
    if [ $attempts -ge $max_attempts ]; then
        echo "TIMEOUT: Frontend failed to start after 60s. Check the 'frontend/frontend.log' file to understand the error."
        exit 1
    fi
  done
  
  echo "Frontend is ready!"
  
  # Fail-safe for xdg-open on headless systems / WSL without GUI
  if command -v xdg-open &> /dev/null && [ -n "$DISPLAY" -o -n "$WAYLAND_DISPLAY" ]; then
      xdg-open http://localhost:3000
  else
      echo "Application successfully started! Access manually via browser: http://localhost:3000"
  fi
) &

echo "Initialization process triggered. Press CTRL+C at any time to shut down the servers."
wait