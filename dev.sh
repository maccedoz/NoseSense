#!/bin/bash

trap "kill 0" EXIT

if [! python3 -v]; then 
    sudo apt install python3
fi

if [! node -v]; then 
    sudo apt install nodejs
fi

if [! pnpm -v]; then 
    sudo apt install pnpm
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