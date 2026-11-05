from io import BytesIO

from pptx import Presentation


def _pptx_bytes() -> bytes:
    buffer = BytesIO()
    Presentation().save(buffer)
    return buffer.getvalue()


def _create_task(client, **overrides):
    body = {
        "title": "Отчет за квартал",
        "text": "# Продажи\n- рост на 12%\n- новые клиенты\n\n# Регионы\n- Москва\n- Казань",
        "slides_count": 3,
        "mode": "sync",
    }
    body.update(overrides)
    return client.post("/tasks", json=body)


def test_requires_api_key(client):
    client.headers.pop("X-API-Key")
    assert client.get("/tasks").status_code == 401


def test_sync_generation_and_download(client):
    response = _create_task(client)
    assert response.status_code == 200
    task = response.json()
    assert task["status"] == "completed"
    assert task["outline"] and task["outline"][0]["type"] in {
        "text",
        "table",
        "chart",
        "comparison",
        "image",
    }

    pptx = client.get(f"/tasks/{task['id']}/result", params={"format": "pptx"})
    assert pptx.status_code == 200
    assert len(Presentation(BytesIO(pptx.content)).slides) == 1 + len(task["outline"])
    assert (
        client.get(f"/tasks/{task['id']}/result", params={"format": "pdf"}).status_code
        == 404
    )


def test_async_returns_accepted_with_id(client):
    response = client.post(
        "/tasks", json={"title": "Async", "text": "Тема\n- тезис", "slides_count": 2}
    )
    assert response.status_code == 202
    assert response.json()["status"] == "queued"


def test_sync_mode_rejects_large_decks(client):
    assert _create_task(client, slides_count=10).status_code == 422


def test_rebuild_reuses_outline_for_render_only_changes(client):
    parent = _create_task(client).json()
    rebuilt = client.post(
        f"/tasks/{parent['id']}/rebuild", json={"title": "Другое название"}
    )
    assert rebuilt.status_code == 202
    body = rebuilt.json()
    assert body["parent_task_id"] == parent["id"]
    assert body["outline"] == parent["outline"]
    assert body["title"] == "Другое название"


def test_rebuild_with_new_slide_count_regenerates_outline(client):
    parent = _create_task(client).json()
    rebuilt = client.post(f"/tasks/{parent['id']}/rebuild", json={"slides_count": 1})
    assert rebuilt.status_code == 202
    assert rebuilt.json()["outline"] is None


def test_history_lists_own_tasks(client):
    _create_task(client)
    history = client.get("/tasks").json()
    assert history and "status" in history[0]


def test_other_users_cannot_see_tasks(client, other_client):
    task = _create_task(client).json()
    assert other_client.get(f"/tasks/{task['id']}").status_code == 404
    assert other_client.get("/tasks").json() == []


def test_template_upload_versions_and_activation(client):
    created = client.post(
        "/templates",
        data={"name": "Корпоративный"},
        files={
            "file": (
                "brand.pptx",
                _pptx_bytes(),
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
        },
    )
    assert created.status_code == 201
    template = created.json()
    assert [v["version"] for v in template["versions"]] == [1]

    second = client.post(
        f"/templates/{template['id']}/versions",
        files={"file": ("brand-v2.pptx", _pptx_bytes(), "application/octet-stream")},
    )
    assert [v["is_active"] for v in second.json()["versions"]] == [False, True]

    rolled_back = client.post(
        f"/templates/{template['id']}/versions/{template['versions'][0]['id']}/activate"
    )
    assert [v["is_active"] for v in rolled_back.json()["versions"]] == [True, False]


def test_template_rejects_non_pptx_and_invalid_content(client):
    bad_name = client.post(
        "/templates",
        data={"name": "x"},
        files={"file": ("doc.docx", b"abc", "application/octet-stream")},
    )
    assert bad_name.status_code == 422
    bad_content = client.post(
        "/templates",
        data={"name": "x"},
        files={"file": ("broken.pptx", b"abc", "application/octet-stream")},
    )
    assert bad_content.status_code == 422


def test_generation_with_template_uses_it(client):
    template = client.post(
        "/templates",
        data={"name": "Шаблон"},
        files={"file": ("t.pptx", _pptx_bytes(), "application/octet-stream")},
    ).json()
    task = _create_task(client, template_id=template["id"]).json()
    assert task["template_version_id"] == template["versions"][0]["id"]
    assert task["status"] == "completed"


def test_mcp_initialize_list_and_generate(client):
    init = client.post(
        "/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}
    )
    assert init.json()["result"]["serverInfo"]["name"] == "presentator"

    tools = client.post(
        "/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
    ).json()
    assert {tool["name"] for tool in tools["result"]["tools"]} >= {
        "generate_presentation",
        "get_result",
    }

    call = client.post(
        "/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "generate_presentation",
                "arguments": {"title": "Из MCP", "text": "Тема\n- тезис"},
            },
        },
    ).json()
    assert call["result"]["isError"] is False
    assert "task_id" in call["result"]["content"][0]["text"]


def test_mcp_notification_returns_accepted(client):
    response = client.post(
        "/mcp", json={"jsonrpc": "2.0", "method": "notifications/initialized"}
    )
    assert response.status_code == 202
