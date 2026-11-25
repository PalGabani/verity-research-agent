import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main, research
from app.db import get_db


@pytest.fixture
def client(monkeypatch):
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    monkeypatch.setattr(main, "engine", test_engine)
    test_session = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr(research, "SessionLocal", test_session)

    def override_get_db():
        with test_session() as session:
            yield session

    main.app.dependency_overrides[get_db] = override_get_db
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()
    test_engine.dispose()


def test_health_checks_database(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_missing_provider_fails_run_explicitly(client, monkeypatch):
    monkeypatch.setattr(research.settings, "openai_api_key", None)
    monkeypatch.setattr(research.settings, "tavily_api_key", None)
    response = client.post(
        "/research/runs",
        json={"question": "How does source verification improve research quality?"},
    )
    assert response.status_code == 502
    assert "OPENAI_API_KEY is required" in response.json()["detail"]

    runs = client.get("/research/runs")
    assert runs.status_code == 200
    assert runs.json()[0]["status"] == "failed"

    details = client.get(f"/research/runs/{runs.json()[0]['id']}")
    assert details.status_code == 200
    assert details.json()["stage"] == "failed"
    assert "OPENAI_API_KEY is required" in details.json()["error"]
