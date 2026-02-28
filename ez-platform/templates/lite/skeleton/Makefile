.PHONY: install test lint build run

SERVICE := ${{ values.name }}
IMAGE   := $(SERVICE):local

install:
	pip install -r requirements-dev.txt

test:
	pytest tests/ -v --cov=src --cov-report=term-missing --cov-report=xml

lint:
	ruff check src/ tests/
	ruff format --check src/ tests/

build:
	docker build -t $(IMAGE) .

run:
	docker run --rm -p 8080:8080 $(IMAGE)
