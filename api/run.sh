#!/bin/bash
# Script to run the FastAPI backend

cd "$(dirname "$0")"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

