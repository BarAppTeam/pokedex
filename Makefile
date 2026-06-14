PYTHON ?= python3
VENV ?= .venv
CLIENT_DIR ?= client
HOST ?= 127.0.0.1
PORT ?= 8080
CLIENT_PORT ?= 5173
VITE_API_BASE_URL ?=
CLIENT_ORIGIN ?= http://localhost:$(CLIENT_PORT),http://127.0.0.1:$(CLIENT_PORT)

ifeq (,$(wildcard .env))
else
include .env
export
endif

.PHONY: help install install-backend install-frontend backend frontend test test-backend test-frontend build build-frontend

help:
	@echo "Available targets:"
	@echo "  make install          Install backend and frontend dependencies"
	@echo "  make backend          Run Flask API on HOST=$(HOST) PORT=$(PORT)"
	@echo "  make frontend         Run Vite client on CLIENT_PORT=$(CLIENT_PORT)"
	@echo "  make test             Run backend and frontend tests"
	@echo "  make build            Build the frontend"

$(VENV)/bin/python:
	$(PYTHON) -m venv $(VENV)

install-backend: $(VENV)/bin/python
	$(VENV)/bin/pip install -r requirements.txt

install-frontend:
	npm --prefix $(CLIENT_DIR) install

install: install-backend install-frontend

backend: $(VENV)/bin/python
	HOST=$(HOST) PORT=$(PORT) CLIENT_ORIGIN=$(CLIENT_ORIGIN) $(VENV)/bin/python app.py

frontend:
	VITE_API_BASE_URL=$(VITE_API_BASE_URL) npm --prefix $(CLIENT_DIR) run dev -- --host 127.0.0.1 --port $(CLIENT_PORT)

test-backend: $(VENV)/bin/python
	$(VENV)/bin/python -m pytest tests/test_app.py -q

test-frontend:
	npm --prefix $(CLIENT_DIR) test

test: test-backend test-frontend

build-frontend:
	VITE_API_BASE_URL=$(VITE_API_BASE_URL) npm --prefix $(CLIENT_DIR) run build

build: build-frontend
