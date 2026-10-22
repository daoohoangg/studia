"""
Writing API — chấm IELTS Writing Task 1/2 bằng AI (4 tiêu chí band + sửa lỗi từng câu).
"""
from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.services import writing_grader as wg

router = APIRouter(prefix="/writing", tags=["Writing"])


class GradeRequest(BaseModel):
    task: str = "task2"          # task1 | task2
    prompt: str = ""             # đề bài
    essay: str


@router.post("/grade")
async def grade_writing(req: GradeRequest):
    if req.task not in wg.TASKS:
        raise HTTPException(status_code=422, detail="Task không hợp lệ, chọn task1 hoặc task2")
    essay = (req.essay or "").strip()
    words = wg.count_words(essay)
    if words < wg.MIN_WORDS_TO_GRADE:
        raise HTTPException(status_code=422, detail=f"Bài viết quá ngắn ({words} từ). Cần ít nhất {wg.MIN_WORDS_TO_GRADE} từ để chấm.")
    if words > wg.MAX_WORDS:
        raise HTTPException(status_code=422, detail=f"Bài viết quá dài ({words} từ). Tối đa {wg.MAX_WORDS} từ.")
    if len(req.prompt) > 2000:
        raise HTTPException(status_code=422, detail="Đề bài quá dài (tối đa 2000 ký tự)")

    result = await run_in_threadpool(wg.grade, req.task, req.prompt, essay)
    if result is None:
        raise HTTPException(status_code=503, detail="Chưa chấm được bài lúc này: trợ lý AI không khả dụng hoặc trả kết quả lỗi. Hãy thử lại sau.")
    return result
