"""
Exam Sets API — bộ đề dựng từ sách: dựng đề nháp, duyệt/sửa, gắn audio & hình, publish.

Đáp án chỉ trả cho chủ sở hữu khi gọi `GET /exam-sets/{id}?include_key=true` (màn hình duyệt đề).
"""
import logging
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.config import settings
from app.core.auth import current_user_id, require_owned
from app.core.supabase_client import get_supabase_client
from app.core.uploads import ensure_private_bucket, safe_filename, signed_storage_url
from app.services import sysconfig
from app.services.document_pipeline import load_all_blocks
from app.services.exam_builder import GeminiJsonLLM
from app.services.exam_builder.generate import GenerationError, build_practice_exam
from app.services.exam_builder.schema import strip_answers, to_exam_room_payload
from app.services.exam_builder.service import (
    MEDIA_PREFIX, build_for_document, find_image_slot, now, refine_with_ai, resolve_media, revalidate, summary,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Exam Sets"])

AUDIO_BUCKET = "exam-audio"
MEDIA_BUCKET = "exam-media"
IMAGE_MAX_BYTES = 10 * 1024 * 1024


def _db():
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase không khả dụng")
    return supabase


def _get_set(supabase, set_id: str) -> Dict[str, Any]:
    require_owned("exam_sets", set_id)
    return supabase.table("exam_sets").select("*").eq("id", set_id).execute().data[0]


def _sniff_audio(data: bytes) -> Optional[str]:
    if data[:3] == b"ID3" or (len(data) > 2 and data[0] == 0xFF and data[1] & 0xE0 == 0xE0):
        return "audio/mpeg"
    if data[4:8] == b"ftyp":
        return "audio/mp4"
    if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return "audio/wav"
    if data[:4] == b"OggS":
        return "audio/ogg"
    return None


def _sniff_image(data: bytes) -> Optional[str]:
    if data[:8] == bytes([0x89]) + b"PNG\r\n\x1a\n":
        return "image/png"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


# ============================================================
# Dựng đề từ sách
# ============================================================

class BuildRequest(BaseModel):
    use_ai: bool = False             # làm lại các nhóm khó bằng Gemini (chạy nền)
    replace_drafts: bool = True      # thay các bản nháp cũ của sách này


@router.post("/documents/{document_id}/exam-sets/build")
def build_exam_sets(document_id: str, body: BuildRequest, background_tasks: BackgroundTasks):
    """Dựng đề nháp từ nội dung sách (kể cả phần bạn đã sửa). Phần luật xong ngay; AI (nếu bật) chạy nền."""
    require_owned("documents", document_id)
    supabase = _db()
    document = supabase.table("documents").select("id, title").eq("id", document_id).execute().data[0]
    blocks = supabase.table("document_blocks").select("id").eq("document_id", document_id).limit(1).execute().data
    if not blocks:
        raise HTTPException(status_code=409, detail="Sách chưa có nội dung để dựng đề (đang xử lý hoặc xử lý lỗi).")

    llm = GeminiJsonLLM() if body.use_ai and settings.GEMINI_API_KEY else None
    rows = build_for_document(supabase, current_user_id(), document, llm=llm, replace_drafts=body.replace_drafts)
    if not rows:
        raise HTTPException(
            status_code=422,
            detail="Không nhận ra đề thi nào trong sách này (cần có tiêu đề 'Test N' và các phần LISTENING / "
                   "READING / WRITING / SPEAKING).")
    if llm:
        for row in rows:
            background_tasks.add_task(refine_with_ai, supabase, row["id"], llm)
    return {"document_id": document_id, "ai_requested": body.use_ai, "ai_enabled": bool(llm),
            "exam_sets": [summary(r) for r in rows]}


class GenerateRequest(BaseModel):
    heading_block_id: Optional[str] = None   # chương: từ tiêu đề này tới tiêu đề cùng cấp/cao hơn kế tiếp
    question_count: int = Field(10, ge=3, le=20)


def _chapter_text(blocks: list, heading_id: Optional[str]) -> tuple:
    """(tiêu đề, văn bản) của một chương; không chỉ định chương thì lấy toàn sách."""
    if not heading_id:
        return None, "\n\n".join(b["text"] for b in blocks if b.get("text"))
    start = next((i for i, b in enumerate(blocks) if b["id"] == heading_id), None)
    if start is None or blocks[start].get("block_type") != "heading":
        raise HTTPException(status_code=404, detail="Không tìm thấy tiêu đề chương đã chọn")
    level = blocks[start].get("level") or 1
    end = len(blocks)
    for i in range(start + 1, len(blocks)):
        if blocks[i].get("block_type") == "heading" and (blocks[i].get("level") or 1) <= level:
            end = i
            break
    body = [b["text"] for b in blocks[start + 1:end] if b.get("text") and b.get("block_type") != "table"]
    return blocks[start]["text"].replace("**", ""), "\n\n".join(body)


@router.post("/documents/{document_id}/exam-sets/generate")
def generate_practice_exam(document_id: str, body: GenerateRequest):
    """Tạo bài kiểm tra (đề tự sinh) từ một chương của tài liệu học; câu hỏi được kiểm chứng với nguyên văn."""
    require_owned("documents", document_id)
    supabase = _db()
    document = supabase.table("documents").select("id, title").eq("id", document_id).execute().data[0]
    blocks = load_all_blocks(supabase, document_id)
    if not blocks:
        raise HTTPException(status_code=409, detail="Sách chưa có nội dung để tạo bài kiểm tra.")

    chapter_title, text = _chapter_text(blocks, body.heading_block_id)
    if not body.heading_block_id and len(text) > 15000:
        raise HTTPException(status_code=422, detail="Sách quá dài: hãy chọn một chương để tạo bài kiểm tra.")
    title = f"Kiểm tra: {chapter_title}" if chapter_title else f"Kiểm tra: {document.get('title') or 'Tài liệu'}"

    llm = GeminiJsonLLM() if settings.GEMINI_API_KEY else None
    try:
        content, key, report = build_practice_exam(title, text, body.question_count, llm)
    except GenerationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    row = {
        "id": str(uuid.uuid4()), "user_id": current_user_id(), "source_document_id": document_id,
        "title": title, "family": "generic", "mode": "academic", "status": "draft",
        "content": content, "answer_key": key, "listening_audio_path": None,
        "created_at": now(), "updated_at": now(),
    }
    row["validation"] = revalidate(row)
    supabase.table("exam_sets").insert(row).execute()
    return {"exam_set": summary(row), "report": report}


# ============================================================
# Đọc / sửa / kiểm tra
# ============================================================

@router.get("/exam-sets")
def list_exam_sets(status: Optional[str] = None, document_id: Optional[str] = None):
    supabase = _db()
    query = supabase.table("exam_sets").select("*").eq("user_id", current_user_id())
    if status:
        query = query.eq("status", status)
    if document_id:
        query = query.eq("source_document_id", document_id)
    rows = query.order("created_at", desc=True).limit(200).execute().data or []
    return {"exam_sets": [summary(r) for r in rows if r.get("status") != "archived" or status == "archived"]}


def _signer(supabase):
    def sign(path: str) -> Optional[str]:
        return signed_storage_url(supabase, MEDIA_BUCKET, path, settings.SIGNED_URL_TTL_SECONDS)
    return sign


@router.get("/exam-sets/{set_id}")
def get_exam_set(set_id: str, include_key: bool = Query(False)):
    supabase = _db()
    row = _get_set(supabase, set_id)
    result = {
        **summary(row),
        "content": resolve_media(row.get("content") or {}, _signer(supabase)),
        "validation": row.get("validation") or {},
    }
    if include_key:
        result["answer_key"] = row.get("answer_key") or {}
    return result


class ExamSetUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[Dict[str, Any]] = None
    answer_key: Optional[Dict[str, Any]] = None


@router.patch("/exam-sets/{set_id}")
def update_exam_set(set_id: str, body: ExamSetUpdate):
    """Ghi đè nội dung/đáp án đã chỉnh trên màn hình duyệt, rồi kiểm tra lại. Đề đã publish phải gỡ publish trước."""
    supabase = _db()
    row = _get_set(supabase, set_id)
    if row.get("status") == "published":
        raise HTTPException(status_code=409, detail="Đề đã publish. Hãy gỡ publish trước khi sửa.")
    if (row.get("validation") or {}).get("build", {}).get("state") == "refining":
        raise HTTPException(status_code=409, detail="AI đang làm lại đề, vui lòng chờ xong rồi sửa.")

    changes: Dict[str, Any] = {}
    if body.content is not None:
        if body.content.get("schema_version") != 1 or not isinstance(body.content.get("sections"), dict):
            raise HTTPException(status_code=422, detail="Nội dung đề không đúng định dạng ExamSet v1")
        changes["content"] = body.content
    if body.answer_key is not None:
        changes["answer_key"] = body.answer_key
    if body.title is not None:
        changes["title"] = body.title.strip() or row.get("title")
    if not changes:
        return summary(row)

    updated = {**row, **changes}
    if "title" in changes and isinstance(updated.get("content"), dict):
        updated["content"] = {**updated["content"], "title": updated["title"]}
        changes["content"] = updated["content"]
    changes["validation"] = revalidate(updated)
    changes["updated_at"] = now()
    supabase.table("exam_sets").update(changes).eq("id", set_id).execute()
    return {**summary({**row, **changes}), "validation": changes["validation"]}


@router.post("/exam-sets/{set_id}/validate")
def validate_exam_set(set_id: str):
    supabase = _db()
    row = _get_set(supabase, set_id)
    validation = revalidate(row)
    supabase.table("exam_sets").update({"validation": validation}).eq("id", set_id).execute()
    return {"id": set_id, "validation": validation}


# ============================================================
# Audio & hình
# ============================================================

@router.post("/exam-sets/{set_id}/audio")
async def upload_audio(set_id: str, file: UploadFile = File(...)):
    supabase = _db()
    row = await run_in_threadpool(_get_set, supabase, set_id)
    max_mb = sysconfig.limit("MAX_AUDIO_MB")
    limit = max_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Tệp audio rỗng")
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"Tệp audio vượt quá {max_mb} MB")
    content_type = _sniff_audio(data)
    if not content_type:
        raise HTTPException(status_code=400, detail="Không nhận ra định dạng audio (hỗ trợ MP3, M4A, WAV, OGG)")

    path = f"{row['user_id']}/{set_id}/{uuid.uuid4().hex[:8]}_{safe_filename(file.filename, 'audio.mp3')}"

    def store():
        ensure_private_bucket(supabase, AUDIO_BUCKET)
        supabase.storage.from_(AUDIO_BUCKET).upload(
            path=path, file=data, file_options={"content-type": content_type, "x-upsert": "true"})
        updated = {**row, "listening_audio_path": path}
        validation = revalidate(updated)
        supabase.table("exam_sets").update({
            "listening_audio_path": path, "validation": validation, "updated_at": now(),
        }).eq("id", set_id).execute()
        return validation

    validation = await run_in_threadpool(store)
    return {"id": set_id, "audio_path": path, "size": len(data), "content_type": content_type,
            "warnings": len(validation["warnings"])}


@router.get("/exam-sets/{set_id}/audio-url")
def get_audio_url(set_id: str):
    supabase = _db()
    row = _get_set(supabase, set_id)
    path = row.get("listening_audio_path")
    if not path:
        raise HTTPException(status_code=404, detail="Đề chưa có audio")
    url = signed_storage_url(supabase, AUDIO_BUCKET, path, settings.SIGNED_URL_TTL_SECONDS)
    if not url:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp audio trong kho lưu trữ")
    return {"url": url, "expires_in": settings.SIGNED_URL_TTL_SECONDS}


@router.post("/exam-sets/{set_id}/images")
async def upload_image(set_id: str, target: str = Query(..., description="writing.task1 | group:listening:15"),
                       file: UploadFile = File(...)):
    supabase = _db()
    row = await run_in_threadpool(_get_set, supabase, set_id)
    data = await file.read(IMAGE_MAX_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Tệp ảnh rỗng")
    if len(data) > IMAGE_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Ảnh vượt quá 10 MB")
    content_type = _sniff_image(data)
    if not content_type:
        raise HTTPException(status_code=400, detail="Không nhận ra định dạng ảnh (hỗ trợ PNG, JPEG, GIF, WebP)")

    content = row.get("content") or {}
    if find_image_slot(content, target) is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy vị trí '{target}' trong đề")

    path = f"{row['user_id']}/{set_id}/{uuid.uuid4().hex[:8]}_{safe_filename(file.filename, 'image.png')}"

    def store():
        ensure_private_bucket(supabase, MEDIA_BUCKET)
        supabase.storage.from_(MEDIA_BUCKET).upload(
            path=path, file=data, file_options={"content-type": content_type, "x-upsert": "true"})
        find_image_slot(content, target)["image_url"] = f"{MEDIA_PREFIX}{path}"
        validation = revalidate({**row, "content": content})
        supabase.table("exam_sets").update({
            "content": content, "validation": validation, "updated_at": now(),
        }).eq("id", set_id).execute()

    await run_in_threadpool(store)
    return {"id": set_id, "target": target, "image_path": path}


# ============================================================
# Publish
# ============================================================

@router.post("/exam-sets/{set_id}/publish")
def publish_exam_set(set_id: str):
    supabase = _db()
    row = _get_set(supabase, set_id)
    validation = revalidate(row)
    if validation["errors"]:
        supabase.table("exam_sets").update({"validation": validation}).eq("id", set_id).execute()
        raise HTTPException(status_code=409, detail={
            "message": f"Còn {len(validation['errors'])} lỗi cần sửa trước khi publish.",
            "errors": validation["errors"][:20],
        })
    if (row.get("validation") or {}).get("build", {}).get("state") == "refining":
        raise HTTPException(status_code=409, detail="AI đang làm lại đề, vui lòng chờ xong.")
    supabase.table("exam_sets").update({"status": "published", "validation": validation, "updated_at": now()}) \
        .eq("id", set_id).execute()
    return {"id": set_id, "status": "published", "warnings": len(validation["warnings"])}


@router.post("/exam-sets/{set_id}/unpublish")
def unpublish_exam_set(set_id: str):
    supabase = _db()
    _get_set(supabase, set_id)
    supabase.table("exam_sets").update({"status": "draft", "updated_at": now()}).eq("id", set_id).execute()
    return {"id": set_id, "status": "draft"}


@router.delete("/exam-sets/{set_id}")
def archive_exam_set(set_id: str):
    supabase = _db()
    _get_set(supabase, set_id)
    supabase.table("exam_sets").update({"status": "archived", "updated_at": now()}).eq("id", set_id).execute()
    return {"id": set_id, "status": "archived"}


@router.get("/exam-sets/{set_id}/preview")
def preview_exam_room_payload(set_id: str):
    """Dữ liệu đúng như thí sinh sẽ nhận (không đáp án) — để xem thử phòng thi trước khi publish."""
    supabase = _db()
    row = _get_set(supabase, set_id)
    content = resolve_media(strip_answers(row.get("content") or {}), _signer(supabase))
    audio_url = None
    if row.get("listening_audio_path"):
        audio_url = signed_storage_url(supabase, AUDIO_BUCKET, row["listening_audio_path"],
                                       settings.SIGNED_URL_TTL_SECONDS)
    return {"id": set_id, "title": row.get("title"), "questions": to_exam_room_payload(content, audio_url)}
