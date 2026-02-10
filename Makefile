SHELL := /bin/bash
VENV := .venv
UVICORN := $(VENV)/bin/uvicorn
PYTHON := $(VENV)/bin/python
UV := uv
ALEMBIC := $(VENV)/bin/alembic

.PHONY: init create install update sync run activate clean import start build-frontend build serve migrate upgrade-migration

init:
	$(UV) init

create:
	@if [ ! -d "$(VENV)" ]; then \
		$(UV) venv $(VENV); \
	fi

sync: create
	$(UV) sync

import:
	uv add -r requirements.txt
	uv sync


install: create
	@if [ -f pyproject.toml ]; then \
		$(UV) sync; \
	elif [ -f requirements.txt ]; then \
		$(UV) pip install -r requirements.txt; \
	else \
		echo "No pyproject.toml or requirements.txt found."; \
		exit 1; \
	fi

update: create
	@if [ -f pyproject.toml ]; then \
		$(UV) sync; \
	elif [ -f requirements.txt ]; then \
		$(UV) pip install -U -r requirements.txt; \
	else \
		echo "No pyproject.toml or requirements.txt found."; \
		exit 1; \
	fi

run: create
	$(PYTHON) main.py

start:
	$(UVICORN) app.main:app --reload

build-frontend:
	cd frontend && npm ci && npm run build

build: install build-frontend
	@echo "Backend and frontend built. Run 'make serve' to start production server."

serve:
	PORT=$${PORT:-8000} $(UVICORN) app.main:app --host 0.0.0.0 --port $$PORT

activate:
	@echo "Run: source $(VENV)/bin/activate"

clean:
	rm -rf $(VENV)

# Start Postgres (required for migrate / upgrade-migration). Use: make db-up
db-up:
	docker compose up -d db
	@echo "Waiting for Postgres..."
	@sleep 2
	@echo "Set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/email_auto_agent"

migrate:
	@echo "Ensure Postgres is running (e.g. make db-up or brew services start postgresql)"
	$(ALEMBIC) revision --autogenerate -m "$(message)"

upgrade-migration:
	$(ALEMBIC) upgrade head