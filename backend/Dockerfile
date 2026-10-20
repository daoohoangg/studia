# Backend FastAPI cho Hugging Face Spaces (Docker) / Render / Cloud Run / VPS.
# Hugging Face Spaces: cổng 7860 (khai báo app_port trong README.md), chạy bằng user uid 1000.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --user -r requirements.txt

COPY --chown=user . .
# Ổ đĩa của Space là tạm thời: dữ liệu thật phải nằm trên Supabase. Thư mục này chỉ là fallback.
RUN mkdir -p data/storage

ENV HOST=0.0.0.0 PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
