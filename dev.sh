#!/bin/bash

trap "kill 0" EXIT

fuser -k 8001/tcp 3000/tcp 2>/dev/null
if ! command -v python3 &> /dev/null; then 
    sudo apt update && sudo apt install -y python3 python3-venv
fi

if ! command -v node &> /dev/null; then 
    sudo apt update && sudo apt install -y nodejs
fi

if ! command -v pnpm &> /dev/null; then 
    sudo npm install -g pnpm
fi

cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001 &
BACKEND_PID=$!

cd ../frontend

rm -rf .next

pnpm install
pnpm run dev &
FRONTEND_PID=$!
(
  until curl -s http://localhost:3000 > /dev/null; do
    sleep 1
  done
  xdg-open http://localhost:3000
) &

wait