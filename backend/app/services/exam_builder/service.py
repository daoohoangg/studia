"""
Lưu và xử lý đề nháp trong DB: dựng từ sách, làm lại bằng AI ở nền, gắn tệp (audio/hình), publish.
"""
import copy
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.services.document_pipeline import load_all_blocks
from app.services.exam_builder import ExamDraft, build_exam_drafts
from app.services.exam_builder.extractor import JsonLLM, block_text, group_needs_help, refine_group
from app.services.exam_builder.schema import iter_groups
from app.services.exam_builder.validator import validate_exam

logger = logging.getLogger(__name__)

MEDIA_PREFIX = "media:"   # image_url dạng "media:{đường dẫn trong bucket exam-media}", đổi sang signed URL khi dùng


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def summary(row: Dict[str, Any]) -> Dict[str, Any]:
    """Thông tin gọn của một đề (không kèm nội dung/đáp án)."""
    validation = row.get("validation") or {}
    return {
        "id": row["id"],
        "title": row.get("title"),
        "family": row.get("family"),
        "mode": row.get("mode"),
        "status": row.get("status"),
        "source_document_id": row.get("source_document_id"),
        "has_audio": bool(row.get("listening_audio_path")),
        "errors": len(validation.get("errors", [])),
        "warnings": len(validation.get("warnings", [])),
        "stats": validation.get("stats", {}),
        "build_state": (validation.get("build") or {}).get("state", "ready"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def revalidate(row: Dict[str, Any]) -> Dict[str, Any]:
    """Chạy lại validator, giữ trạng thái dựng (build) cũ."""
    result = validate_exam(row.get("content") or {}, row.get("answer_key") or {},
                           has_audio=bool(row.get("listening_audio_path")))
    previous = (row.get("validation") or {}).get("build")
    if previous:
        result["build"] = previous
    return result


def build_for_document(supabase, user_id: str, document: Dict[str, Any], llm: Optional[JsonLLM] = None,
                       replace_drafts: bool = True) -> List[Dict[str, Any]]:
    """Dựng các đề nháp từ khối nội dung của sách và lưu vào `exam_sets`. Trả về các dòng đã lưu."""
    blocks = load_all_blocks(supabase, document["id"])
    drafts: List[ExamDraft] = build_exam_drafts(blocks)  # nhanh; AI (nếu bật) chạy nền sau đó

    if replace_drafts:
        old = supabase.table("exam_sets").select("id").eq("source_document_id", document["id"]) \
            .eq("user_id", user_id).eq("status", "draft").execute().data or []
        for row in old:
            supabase.table("exam_sets").delete().eq("id", row["id"]).execute()

    rows: List[Dict[str, Any]] = []
    for draft in drafts:
        title = f"{document.get('title') or 'Sách'} — {draft.title}" if document.get("title") else draft.title
        content = copy.deepcopy(draft.content)
        content["title"] = title
        validation = dict(draft.validation)
        validation["build"] = {"state": "refining" if llm else "ready", "ai": bool(llm)}
        row = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "source_document_id": document["id"],
            "title": title,
            "family": "ielts",
            "mode": "academic",
            "status": "draft",
            "content": content,
            "answer_key": draft.answer_key,
            "validation": validation,
            "listening_audio_path": None,
            "created_at": now(),
            "updated_at": now(),
        }
        supabase.table("exam_sets").insert(row).execute()
        rows.append(row)
    return rows


def refine_with_ai(supabase, set_id: str, llm: JsonLLM) -> None:
    """Chạy nền: làm lại các nhóm câu hỏi luật xử lý chưa tốt, rồi validate lại và đánh dấu xong."""
    try:
        rows = supabase.table("exam_sets").select("*").eq("id", set_id).execute().data
        if not rows:
            return
        row = rows[0]
        content = row["content"]
        document_id = row.get("source_document_id")
        blocks = {b["id"]: b for b in load_all_blocks(supabase, document_id)} if document_id else {}

        changed = 0
        for skill in ("listening", "reading"):
            for _label, group in iter_groups(content, skill):
                if group.get("source") != "heuristic" or not group_needs_help(group):
                    continue
                body = "\n".join(block_text(blocks[i]) for i in group.get("source_block_ids", []) if i in blocks)
                if not body:
                    continue
                refined = refine_group(llm, group, body)
                if refined is not group:
                    group.clear()
                    group.update(refined)
                    changed += 1

        # Chỉ ghi nếu người dùng chưa kịp sửa tay trong lúc AI chạy
        current = supabase.table("exam_sets").select("updated_at").eq("id", set_id).execute().data[0]
        validation = revalidate({**row, "content": content})
        validation["build"] = {"state": "ready", "ai": True, "groups_refined": changed}
        update: Dict[str, Any] = {"validation": validation}
        if current.get("updated_at") == row.get("updated_at"):
            update.update({"content": content, "updated_at": now()})
        supabase.table("exam_sets").update(update).eq("id", set_id).execute()
    except Exception as e:
        logger.error(f"[{set_id}] AI refinement failed: {e}", exc_info=True)
        try:
            rows = supabase.table("exam_sets").select("validation").eq("id", set_id).execute().data
            validation = (rows[0].get("validation") or {}) if rows else {}
            validation["build"] = {"state": "ready", "ai": False, "error": str(e)[:200]}
            supabase.table("exam_sets").update({"validation": validation}).eq("id", set_id).execute()
        except Exception:
            pass


# ─── Tham chiếu tệp media trong nội dung đề ───────────────────

def iter_image_slots(content: Dict[str, Any]):
    """(dict chứa khoá image_url, mô tả vị trí) — Writing Task 1 và các nhóm câu hỏi."""
    writing = (content.get("sections") or {}).get("writing") or {}
    for task in ("task1", "task2"):
        if isinstance(writing.get(task), dict):
            yield writing[task], f"writing.{task}"
    for skill in ("listening", "reading"):
        for _label, group in iter_groups(content, skill):
            yield group, f"group:{skill}:{group.get('range', ['?'])[0]}"


def find_image_slot(content: Dict[str, Any], target: str) -> Optional[Dict[str, Any]]:
    for slot, name in iter_image_slots(content):
        if name == target:
            return slot
    return None


def resolve_media(content: Dict[str, Any], sign) -> Dict[str, Any]:
    """Bản sao `content` với image_url "media:..." đổi thành signed URL (hàm `sign(path) -> url|None`)."""
    resolved = copy.deepcopy(content)
    for slot, _name in iter_image_slots(resolved):
        url = slot.get("image_url")
        if isinstance(url, str) and url.startswith(MEDIA_PREFIX):
            slot["image_url"] = sign(url[len(MEDIA_PREFIX):])
    return resolved
