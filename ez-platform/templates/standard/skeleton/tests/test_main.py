"""
Unit tests for ${{ values.name }}
"""
import pytest
from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_healthz():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readyz():
    response = client.get("/readyz")
    assert response.status_code == 200
    assert response.json()["status"] in ("ready", "ok")


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "${{ values.name }}"
    assert data["team"] == "${{ values.team }}"
