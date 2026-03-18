"""Tests for ez-demo service."""
import pytest
from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_healthz():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_readyz():
    response = client.get("/readyz")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "ez-demo"
    assert data["team"] == "platform"
    assert "golden_path" in data
    assert data["golden_path"]["tier"] == "lite"


def test_golden_path_endpoint():
    response = client.get("/golden-path")
    assert response.status_code == 200
    data = response.json()
    assert "what_you_get" in data
    assert "repositories" in data
    assert len(data["what_you_get"]) > 0
    assert "ez-platform" in data["repositories"]
