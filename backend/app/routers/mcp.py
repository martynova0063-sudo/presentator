import base64
import json

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import storage
from app.db import get_db
from app.models import Template, User
from app.schemas import TaskCreate
from app.security import get_current_user
from app.services import get_owned_task, submit_task, validation_message

router = APIRouter(tags=["MCP"])

PROTOCOL_VERSION = "2025-03-26"
SERVER_INFO = {"name": "presentator", "version": "1.0.0"}
PPTX_MEDIA = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

TOOLS = [
    {
        "name": "generate_presentation",
        "description": "Создать презентацию в асинхронном режиме. Возвращает идентификатор задачи.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Название презентации"},
                "text": {
                    "type": "string",
                    "description": "Описание или структура содержания",
                },
                "slides_count": {"type": "integer", "minimum": 1, "maximum": 40},
                "language": {"type": "string", "enum": ["ru", "en"]},
                "audience": {"type": "string"},
                "tone": {"type": "string"},
                "template_id": {"type": "integer"},
                "want_pdf": {"type": "boolean"},
            },
            "required": ["title"],
        },
    },
    {
        "name": "get_task_status",
        "description": "Статус и прогресс задачи генерации.",
        "inputSchema": {
            "type": "object",
            "properties": {"task_id": {"type": "string"}},
            "required": ["task_id"],
        },
    },
    {
        "name": "list_templates",
        "description": "Список корпоративных шаблонов с активной версией.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_result",
        "description": "Готовый файл презентации в base64 (после статуса completed).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string"},
                "format": {"type": "string", "enum": ["pptx", "pdf"]},
            },
            "required": ["task_id"],
        },
    },
]


@router.post("/mcp", summary="MCP-сервер (Streamable HTTP)")
def mcp_endpoint(
    message: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    method = message.get("method")
    request_id = message.get("id")
    if request_id is None:
        return Response(status_code=202)
    try:
        result = _dispatch(method, message.get("params") or {}, user, db)
    except _UnknownMethod:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": -32601, "message": "Метод не найден"},
        }
    return {"jsonrpc": "2.0", "id": request_id, "result": result}


class _UnknownMethod(Exception):
    pass


def _dispatch(method: str | None, params: dict, user: User, db: Session) -> dict:
    if method == "initialize":
        return {
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {"tools": {}},
            "serverInfo": SERVER_INFO,
        }
    if method == "tools/list":
        return {"tools": TOOLS}
    if method == "tools/call":
        return _call_tool(params.get("name"), params.get("arguments") or {}, user, db)
    raise _UnknownMethod(method)


def _call_tool(name: str | None, args: dict, user: User, db: Session) -> dict:
    try:
        payload = _run_tool(name, args, user, db)
    except HTTPException as exc:
        return _tool_result(exc.detail, is_error=True)
    except ValidationError as exc:
        return _tool_result(validation_message(exc), is_error=True)
    return _tool_result(payload)


def _run_tool(name: str | None, args: dict, user: User, db: Session) -> dict:
    if name == "generate_presentation":
        task = submit_task(
            db, user, TaskCreate.model_validate({**args, "mode": "async"})
        )
        return {"task_id": task.id, "status": task.status}
    if name == "get_task_status":
        task = get_owned_task(db, user, args.get("task_id", ""))
        return {
            "task_id": task.id,
            "status": task.status,
            "progress": task.progress,
            "error": task.error,
        }
    if name == "list_templates":
        templates = db.scalars(
            select(Template).where(Template.owner_id == user.id).order_by(Template.id)
        ).all()
        return {
            "templates": [
                {
                    "id": template.id,
                    "name": template.name,
                    "active_version": next(
                        (v.version for v in template.versions if v.is_active), None
                    ),
                }
                for template in templates
            ]
        }
    if name == "get_result":
        return _result(args, user, db)
    raise HTTPException(status_code=404, detail=f"Неизвестный инструмент: {name}")


def _result(args: dict, user: User, db: Session) -> dict:
    task = get_owned_task(db, user, args.get("task_id", ""))
    fmt = args.get("format", "pptx")
    key = task.pptx_key if fmt == "pptx" else task.pdf_key if fmt == "pdf" else None
    if key is None:
        raise HTTPException(status_code=409, detail="Файл в этом формате еще не готов")
    return {
        "format": fmt,
        "filename": f"{task.title}.{fmt}",
        "media_type": PPTX_MEDIA if fmt == "pptx" else "application/pdf",
        "base64": base64.b64encode(storage.load(key)).decode(),
    }


def _tool_result(payload, is_error: bool = False) -> dict:
    text = (
        payload
        if isinstance(payload, str)
        else json.dumps(payload, ensure_ascii=False, default=str)
    )
    return {"content": [{"type": "text", "text": text}], "isError": is_error}
