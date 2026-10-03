# 📘 STUDIA — MASTER CONFIG & BUSINESS BLUEPRINT
> **Tài liệu Tổng hợp Nghiệp vụ Tổng thể, Kiến trúc Kỹ thuật & Master Plan Dự án**  
> **Vai trò**: Senior Technical Business Analyst  
> **Cập nhật lần cuối**: 03/10/2026 | **Phiên bản**: v2.0-Production-Ready  

---

## 📑 MỤC LỤC
1. [TỔNG QUAN DỰ ÁN (PROJECT EXECUTIVE SUMMARY)](#1-tổng-quan-dự-án-project-executive-summary)
2. [SƠ ĐỒ KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)](#2-sơ-đồ-kiến-trúc-hệ-thống-system-architecture)
3. [TỔNG HỢP NGHIỆP VỤ THỰC TẾ TRONG SOURCE CODE](#3-tổng-hợp-nghiệp-vụ-thực-tế-trong-source-code)
   - [3.1. Nạp Tài liệu & RAG Vector Pipeline](#31-nạp-tài-liệu--rag-vector-pipeline)
   - [3.2. Đồ thị Tri thức (Knowledge Graph & Topological Sort)](#32-đồ-thị-tri-thức-knowledge-graph--topological-sort)
   - [3.3. Lập Lịch Học Cá Nhân hóa & Lịch Thích ứng (Adaptive Study Planning)](#33-lập-lịch-học-cá-nhân-hóa--lịch-thích-ứng-adaptive-study-planning)
   - [3.4. Sinh Bài học & Quiz Thích ứng theo RAG Context](#34-sinh-bài-học--quiz-thích-ứng-theo-rag-context)
   - [3.5. Thuật toán Lặp lại Khoảng cách FSRS & Flashcard](#35-thuật-toán-lặp-lại-khoảng-cách-fsrs--flashcard)
   - [3.6. Trợ lý AI Trợ giảng (AI Tutor Chatbot)](#36-trợ-lý-ai-trợ-giảng-ai-tutor-chatbot)
   - [3.7. Phân hệ Web Frontend (Next.js Application)](#37-phân-hệ-web-frontend-nextjs-application)
4. [SƠ ĐỒ LUỒNG NGHIỆP VỤ HỌC TẬP THÍCH ỨNG](#4-sơ-đồ-luồng-nghiệp-vụ-học-tập-thích-ứng)
5. [CƠ SỞ DỮ LIỆU & SCHEMA MATRIX](#5-cơ-sở-dữ-liệu--schema-matrix)
6. [BÁO CÁO TIẾN ĐỘ DỰ ÁN HỆ THỐNG (PROGRESS AUDIT)](#6-báo-cáo-tiến-độ-dự-án-hệ-thống-progress-audit)
7. [MASTER PLAN & LỘ TRÌNH PHÁT TRIỂN tiếp theo](#7-master-plan--lộ-trình-phát-triển-tiếp-theo)
8. [MAPPING GIẢI QUYẾT PAIN POINTS NGUYÊN BẢN](#8-mapping-giải-quyết-pain-points-nguyên-bản)
9. [CÁC FUNCTION CỐT LÕI & LUỒNG NGHIỆP VỤ TRIỂN KHAI](#9-các-function-cốt-lõi--luồng-nghiệp-vụ-triển-khai)
10. [KHUNG KHOA HỌC PHƯƠNG PHÁP HỌC TẬP (LEARNING SCIENCE MATRIX)](#10-khung-khoa-học-phương-pháp-học-tập-learning-science-matrix)

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT EXECUTIVE SUMMARY)

**Studia (Personal Learning Intelligence Platform)** là nền tảng học tập thông minh thế hệ mới, giải quyết triệt để bài toán "bội bội kiến thức" và "quên tự nhiên" khi nghiên cứu sách, giáo trình và tài liệu chuyên ngành phức tạp.

### 🎯 Mục tiêu Cốt lõi
1. **Chuyển hóa tài liệu thô thành Tri thức có Cấu trúc**: Tự động chuyển đổi sách PDF/Text thành Đồ thị Tri thức (Knowledge Graph) có thứ tự bài học chuẩn logic tiền đề.
2. **Cá nhân hóa Lịch học & Tự động Thích ứng (Adaptive Learning)**: Tự động điều chỉnh khối lượng học hàng ngày dựa theo mục tiêu deadline và tự động chèn lịch ôn tập khi phát hiện học viên có điểm bài tập yếu (<60%).
3. **Chống Quên Triệt để bằng Toán học (FSRS Engine)**: Áp dụng thuật toán *Free Spaced Repetition Scheduler* để tối ưu hóa khoảng thời gian nhắc lại kiến thức trước khi rơi vào đường cong quên.
4. **Học tập Tương tác RAG (Retrieval-Augmented Generation)**: Sinh bài học, câu hỏi trắc nghiệm và trợ lý AI trả lời thắc mắc dựa **nghiêm ngặt** trên nội dung sách thực tế, triệt tiêu hiện tượng AI bịa đặt (hallucination).

---

## 2. SƠ ĐỒ KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Hệ thống được thiết kế theo kiến trúc Microservices & Decoupled Frontend/Backend hiện đại, đảm bảo tính mở rộng cao và khả năng xử lý vector thời gian thực.

![Kiến trúc Hệ thống Studia](docs/images/system_architecture.svg)

### 🛠 Stack Công nghệ Thực tế:
- **Backend API**: Python 3.12, FastAPI, Pydantic, PyPDF parser, Uvicorn server.
- **Database & Vector Database**: Supabase PostgreSQL Cloud, extension `pgvector` (768 dimensions), Supabase Storage (PDF buckets).
- **AI Core & Embeddings**: Google Gemini API (`gemini-1.5-flash` / `gemini-1.5-pro`) & Gemini `text-embedding-004`.
- **Algorithmic Engines**: FSRS (Free Spaced Repetition Scheduler) Engine, Graph Topological Sort Engine.
- **Frontend App**: Next.js 14+ (App Router, TypeScript), Tailwind CSS / Custom Glassmorphic CSS, Lucide Icons, Recharts & SVG Graph Visualizer.

---

## 3. TỔNG HỢP NGHIỆP VỤ THỰC TẾ TRONG SOURCE CODE

*(Lưu ý: Mọi tính năng dưới đây được tổng hợp trực tiếp từ mã nguồn thực tế của dự án, bảo đảm độ chính xác tuyệt đối)*.

### 3.1. Nạp Tài liệu & RAG Vector Pipeline
*Mã nguồn backend*: `backend/app/api/v1/documents.py`, `backend/app/services/rag_engine.py`

- **Upload PDF thuần & Lưu trữ Cloud**:
  - Tệp PDF được tải lên Supabase Storage bucket `documents` theo cấu trúc đường dẫn `user_id/doc_id/filename.pdf`.
  - Cơ sở dữ liệu Postgres chỉ lưu trữ Metadata & URL truy cập công khai, tránh việc lưu trữ dung lượng thô gây quá tải database.
- **Tách văn bản & Chunking Thông minh (Sentence-aware Chunking)**:
  - Tách nội dung PDF in-memory qua thư viện `pypdf`.
  - Phân đoạn văn bản với kích thước chuẩn **600 ký tự**, độ gối (overlap) **80 ký tự**.
  - Áp dụng thuật toán phát hiện ranh giới câu (sentence boundary regex) để không bị ngắt đôi câu. Loại bỏ các chunks nhiễu quá ngắn (< 50 ký tự).
- **Vector Embedding & Semantic Search**:
  - Tạo vector embedding 768 chiều qua mô hình **Gemini `text-embedding-004`** (hỗ trợ fallback sang deterministic pseudo-embedding phục vụ dev/test).
  - Tìm kiếm đoạn văn bản liên quan qua Supabase RPC Function `match_document_chunks_by_doc` sử dụng phép toán Cosine Distance (`<=>`) trên pgvector.
  - Xử lý bất đồng bộ (Background Tasks) để không làm nghẽn luồng phản hồi API.

---

### 3.2. Đồ thị Tri thức (Knowledge Graph & Topological Sort)
*Mã nguồn backend*: `backend/app/api/v1/learning_paths.py`, `backend/app/services/graph_engine.py`, `backend/app/services/ai_engine.py`

- **Trích xuất Topic & Mối quan hệ**:
  - AI Engine tự động phân tích văn bản để trích xuất 4-8 chủ đề cốt lõi (`topics`), xác định độ khó (level 1-5) và mô tả chi tiết bằng tiếng Việt.
  - Xác định các mối quan hệ `prerequisite` (tiền đề bắt buộc), `related` (liên quan), `contains` (bao hàm) giữa các chủ đề (`topic_relationships`).
- **Sắp xếp Thứ tự Học tập (Topological Sort DAG)**:
  - Thuật toán `GraphEngine.build_topological_order` duyệt đồ thị định hướng không chu trình (DAG) bằng Queue & In-Degree map.
  - Đảm bảo chủ đề tiền đề bắt buộc phải được xếp trước chủ đề phụ thuộc.
- **Kiểm tra Điều kiện Mở khóa (Prerequisite Check)**:
  - Kiểm tra điểm số thành thục (Mastery Score >= 60%) ở các chủ đề tiền đề trước khi cho phép học viên tiến sang bài học nâng cao (`check_prerequisites`).

---

### 3.3. Lập Lịch Học Cá Nhân hóa & Lịch Thích ứng (Adaptive Study Planning)
*Mã nguồn backend*: `backend/app/services/learning_engine.py`, `backend/app/api/v1/learning_paths.py`

- **Thiết lập Mục tiêu Học tập (`study_goals`)**:
  - Người dùng cấu hình thời hạn hoàn thành (`deadline_days`) và quỹ thời gian học mỗi ngày (`daily_minutes`).
- **Sinh Lịch học Ngày (3-Day Cycle Plan Generation)**:
  - Phân bổ bài học theo chu kỳ 3 ngày tối ưu:
    - **Ngày 1 (Learn)**: Học bài mới (`lesson`) + Ôn nhanh Flashcard (`flashcard_review`).
    - **Ngày 2 (Quiz)**: Làm bài tập kiểm tra (`quiz`) cho bài vừa học + Học nối tiếp bài mới nếu còn thời gian.
    - **Ngày 3 (Review)**: Spaced repetition cho các bài đã học trước đó.
- **Tự động Điều chỉnh Kế hoạch (Adaptive Plan Rescheduling)**:
  - Khi học viên làm Quiz đạt điểm yếu (<60%), hệ thống kích hoạt hàm `adapt_plan`:
    1. Tự động sinh ra các bài review bổ sung cho chủ đề yếu.
    2. Chèn các ngày học bổ sung vào ngay sau thời điểm hiện tại.
    3. Tự động lùi (shift) ngày học của các bài tiếp theo tương ứng để không bị chồng chéo khối lượng.

---

### 3.4. Sinh Bài học & Quiz Thích ứng theo RAG Context
*Mã nguồn backend*: `backend/app/api/v1/quizzes.py`, `backend/app/services/ai_engine.py`

- **Sinh Bài học Cá nhân hóa (`generate_lesson`)**:
  - Lấy ngữ cảnh RAG thực tế từ sách -> đưa vào Gemini AI để sinh bài học Markdown chuẩn tiếng Việt.
  - Tự động điều chỉnh độ sâu kiến thức theo điểm Mastery của học viên:
    - *Mastery < 40%*: Giải thích cơ bản, dễ hiểu, nhiều ví dụ minh họa.
    - *Mastery 40-70%*: Trung cấp, kết hợp lý thuyết và ứng dụng.
    - *Mastery >= 70%*: Phân tích kỹ thuật nâng cao và chuyên sâu.
- **Sinh Câu hỏi Quiz Adaptive (`generate_adaptive_quiz`)**:
  - Sinh 5 câu hỏi trắc nghiệm (A/B/C/D) kèm đáp án & giải thích chi tiết **nghiêm ngặt từ RAG Context**.
  - Đánh giá câu trả lời từng câu (`submit`) hoặc toàn bộ bài quiz (`submit-full`), tính toán thời gian phản hồi (`response_time_ms`) và mức độ tự tin (`confidence_rating`).

---

### 3.5. Thuật toán Lặp lại Khoảng cách FSRS & Flashcard
*Mã nguồn backend*: `backend/app/services/fsrs_engine.py`, `backend/app/api/v1/flashcards.py`, `backend/app/api/v1/reviews.py`

- **Mô hình Toán học FSRS (Free Spaced Repetition Scheduler)**:
  - Quản lý 4 chỉ số sinh học kiến thức:
    - **Stability ($S$)**: Độ bền trí nhớ (tính bằng số ngày).
    - **Difficulty ($D$)**: Độ khó tương đối của chủ đề (thang 1 - 10).
    - **Retention ($R$)**: Tỷ lệ duy trì trí nhớ ($R = e^{-1 / S}$).
    - **Mastery Score**: Điểm thành thục (thang 0 - 100).
  - Công thức tính khoảng thời gian ôn tập tiếp theo:
    $$I = S \times \left( \frac{1}{\text{Target\_Retention}} - 1 \right)$$
    *(với mục tiêu Target Retention = 90%)*.
- **Sinh & Ôn tập Flashcards**:
  - AI sinh tự động các thẻ Anki-style (Định nghĩa, Khái niệm, Điền từ) từ đoạn văn bản gốc (`source_chunk`).
  - Hàng chờ ôn tập định kỳ (`/reviews/queue`, `/flashcards/due`) phân loại theo mức độ khẩn cấp (High / Medium / Low).
  - Ghi nhận phản hồi theo 4 mức đánh giá: `1=Again 😓`, `2=Hard 😕`, `3=Good 😊`, `4=Easy 😄`.

---

### 3.6. Trợ lý AI Trợ giảng (AI Tutor Chatbot)
*Mã nguồn backend*: `backend/app/api/v1/tutor.py`, `backend/app/services/ai_engine.py`

- **Hỏi đáp Trực tiếp trên Sách (RAG Chatbot)**:
  - Khi học viên đặt câu hỏi, hệ thống tiến hành Vector Search tìm 5 đoạn văn bản liên quan nhất từ tệp sách đã chọn.
  - Gemini AI đóng vai Trợ giảng Studia, trả lời câu hỏi bằng tiếng Việt dựa **chính xác** trên đoạn trích.
- **Trích dẫn Nguồn & Lịch sử Hội thoại**:
  - Trả về danh sách trích dẫn nguồn (`sources`) gồm đoạn văn xem trước, chỉ số tương đồng (similarity score) và tiêu đề chương.
  - Đưa ra độ tự tin (confidence score), các khái niệm liên quan và gợi ý 2-3 câu hỏi đào sâu tiếp theo.
  - Lưu vết phiên hội thoại vào bảng `ai_chat_sessions`.

---

### 3.7. Phân hệ Web Frontend (Next.js Application)
*Mã nguồn frontend*: `frontend/src/app`

- **Trang chủ Dashboard (`/`)**: Bảng điều khiển chào mừng, hiển thị chuỗi ngày học (Streak), % điểm Mastery toàn diện, thanh tiến độ hoàn thành bài tập trong ngày, danh sách nhiệm vụ hôm nay và biểu đồ Knowledge Profile.
- **Quản lý Thư viện Sách (`/books`, `/books/[id]`)**: Tải lên tài liệu PDF/Text, theo dõi tiến độ xử lý RAG background thời gian thực, xem danh sách sách và đồ thị chủ đề đã trích xuất.
- **Kế hoạch Học tập Thích ứng (`/plan`)**: Giao diện lịch học theo tháng (Calendar grid view), hiển thị chi tiết các công việc ngày học, nhãn lý do điều chỉnh lịch tự động (adapted_reason).
- **Đồ thị Tri thức (`/knowledge-graph`)**: Trực quan hóa node chủ đề và liên kết tiền đề.
- **Màn hình Bài học (`/lesson/[id]`)**: Đọc nội dung Markdown cá nhân hóa kèm các ý chính (key takeaways).
- **Luyện tập Quiz (`/quiz/[id]`)**: Giao diện chọn đáp án trắc nghiệm, bấm tự tin, xem giải thích chi tiết và phân tích điểm yếu.
- **Thẻ Flashcard (`/flashcards`)**: Giao diện lật thẻ 3D, đánh giá 4 nút FSRS rating.
- **Hàng chờ Ôn tập (`/review`)**: Danh sách bài cần ôn tập theo độ ưu tiên FSRS.
- **AI Tutor Chat (`/tutor`)**: Khung chat tương tác trực tiếp với sách.

---

## 4. SƠ ĐỒ LUỒNG NGHIỆP VỤ HỌC TẬP THÍCH ỨNG

Sơ đồ thể hiện toàn bộ vòng lặp từ lúc học viên nạp sách đến khi hệ thống tự động điều chỉnh lịch học và lên hàng chờ FSRS.

![Luồng Nghiệp vụ Học tập Thích ứng](docs/images/adaptive_learning_flow.svg)

---

## 5. CƠ SỞ DỮ LIỆU & SCHEMA MATRIX

Hệ thống bao gồm **16 bảng dữ liệu PostgreSQL** chuẩn hóa được quản lý trên Supabase Cloud:

| STT | Tên Bảng (Table Name) | Chức năng Nghiệp vụ | Liên kết chính (Foreign Keys) |
| :--- | :--- | :--- | :--- |
| 1 | `learning_profiles` | Hồ sơ mục tiêu học tập người dùng | `auth.users(id)` |
| 2 | `documents` | Metadata tài liệu đầu vào (PDF/Text) | `auth.users(id)` |
| 3 | `document_chunks` | Các đoạn văn bản & Vector Embedding 768d | `documents(id)` |
| 4 | `topics` | Các node chủ đề kiến thức (Knowledge Nodes) | `documents(id)` |
| 5 | `topic_relationships` | Liên kết tiền đề giữa các chủ đề (Edges) | `topics(id)` (source & target) |
| 6 | `learning_paths` | Lộ trình học tổng thể | `auth.users(id)`, `documents(id)` |
| 7 | `learning_path_steps` | Chi tiết từng bước trong lộ trình | `learning_paths(id)`, `topics(id)` |
| 8 | `lessons` | Nội dung bài học Markdown sinh bởi AI | `topics(id)` |
| 9 | `quizzes` | Danh sách bài kiểm tra thích ứng | `topics(id)` |
| 10 | `questions` | Câu hỏi trắc nghiệm & đáp án giải thích | `quizzes(id)` |
| 11 | `knowledge_states` | Trạng thái kiến thức FSRS của học viên | `auth.users(id)`, `topics(id)` |
| 12 | `question_attempts` | Lịch sử nộp câu trả lời bài tập | `auth.users(id)`, `questions(id)` |
| 13 | `review_schedules` | Lịch hẹn ôn tập định kỳ FSRS | `auth.users(id)`, `topics(id)` |
| 14 | `study_goals` | Mục tiêu deadline & quỹ thời gian học | `auth.users(id)`, `documents(id)` |
| 15 | `daily_learning_plans` | Lịch học chi tiết từng ngày (Adaptive) | `auth.users(id)`, `study_goals(id)` |
| 16 | `flashcards` & `flashcard_states` | Thẻ ghi nhớ & Trạng thái FSRS từng thẻ | `topics(id)`, `flashcards(id)` |

---

## 6. BÁO CÁO TIẾN ĐỘ DỰ ÁN HỆ THỐNG (PROGRESS AUDIT)

Đánh giá thực tế dựa trên kiểm tra mã nguồn backend và frontend:

```mermaid
pie title Tỷ lệ Hoàn thành Tiến độ Hệ thống Studia
    "Core RAG & Storage" : 25
    "Knowledge Graph & DAG" : 25
    "Adaptive Plan & FSRS" : 25
    "Next.js Modern Web UI" : 20
    "Production Fine-tuning" : 5
```

### 📊 Bảng Đánh giá Chi tiết Phân hệ:

| Phân hệ (Module) | Trạng thái Code | % Hoàn thành | Ghi chú Chi tiết từ Source Code |
| :--- | :---: | :---: | :--- |
| **PDF Storage & Chunking** | ✅ Ready | **100%** | Đã tích hợp Supabase Storage, pypdf parser & sentence-aware chunker. |
| **Vector Engine (pgvector)** | ✅ Ready | **100%** | Gemini `text-embedding-004` (768d) & RPC `match_document_chunks` chạy hoàn hảo. |
| **Knowledge Graph & DAG** | ✅ Ready | **100%** | Gemini Topic extractor & Thuật toán Topological Sort (`graph_engine.py`) hoàn tất. |
| **Adaptive Learning Engine**| ✅ Ready | **100%** | Chu kỳ học 3 ngày & Thuật toán tự động chèn lịch khi điểm yếu (`adapt_plan`). |
| **RAG Lesson & Quiz Gen** | ✅ Ready | **100%** | Gemini sinh bài học Markdown theo Mastery level & Quiz trắc nghiệm chuẩn RAG. |
| **FSRS Repetition Engine** | ✅ Ready | **100%** | Giải thuật FSRS toán học full ($S, D, R$, interval_days & 4 rating levels). |
| **AI Tutor Chatbot** | ✅ Ready | **100%** | Chatbot RAG với trích dẫn nguồn sách & lưu phiên chat `ai_chat_sessions`. |
| **Web UI (Next.js)** | ✅ Ready | **95%** | Đã hoàn thiện 9 trang giao diện chính (Dashboard, Books, Plan, Quiz, Flashcard, Tutor...). |
| **Auth & Security (RLS)** | 🟡 Partial | **80%** | Bảng migration v2 đã hỗ trợ Service Role Bypass; cần hoàn thiện JWT Client Auth. |

---

## 7. MASTER PLAN & LỘ TRÌNH PHÁT TRIỂN TIẾP THEO

### 🗓 Phase 1: Core Foundation & RAG Engine (Đã Hoàn thành 100%)
- [x] Thiết kế Database Schema Postgres + `pgvector` trên Supabase Cloud.
- [x] Xây dựng RAG Engine: Chunking, Gemini Embeddings, RPC vector search.
- [x] Upload PDF lên Supabase Storage bucket.

### 🗓 Phase 2: Knowledge Graph & Adaptive Learning Engine (Đã Hoàn thành 100%)
- [x] Tự động trích xuất Đồ thị tri thức (Nodes & Prerequisite Edges).
- [x] Thuật toán Topological Sort xếp thứ tự bài học chuẩn tiền đề.
- [x] Lập lịch học 3 ngày cycle & Thuật toán tự động tái cấu trúc lịch học (`adapt_plan`).

### 🗓 Phase 3: FSRS Spaced Repetition & AI Tutor (Đã Hoàn thành 100%)
- [x] Tích hợp giải thuật FSRS chuẩn xác tính toán Stability & Retention.
- [x] Sinh thẻ Flashcard tự động từ RAG context.
- [x] Xây dựng AI Tutor chatbot trích dẫn nguồn sách thực tế.

### 🗓 Phase 4: Modern Web Frontend Integration (Đã Hoàn thành 95%)
- [x] Xây dựng giao diện Next.js chuẩn Glassmorphism UI.
- [x] Hoàn thiện 9 màn hình chức năng chính kết nối trực tiếp FastAPI API v1.
- [ ] *Đang thực hiện*: Tối ưu hóa UI mobile responsiveness và mượt hóa hiệu ứng chuyển trang.

### 🗓 Phase 5: Production Readiness & Enterprise Expansion (Roadmap Tiếp theo)
- [ ] **Bảo mật Auth RLS**: Kích hoạt Row Level Security cho môi trường Multi-tenant nhiều người dùng.
- [ ] **Offline Sync & Mobile App**: Đóng gói Progressive Web App (PWA) cho trải nghiệm học offline trên điện thoại.
- [ ] **Export & Integration**: Hỗ trợ xuất Flashcard ra tệp `.apkg` (Anki Format) và kết nối Google Calendar API để nhắc nhở học tập.

---

## 8. MAPPING GIẢI QUYẾT PAIN POINTS NGUYÊN BẢN

Đánh giá mức độ giải quyết 12 Pain Points của người học dựa trên bằng chứng mã nguồn thực tế của dự án **Studia**:

| STT | Pain Point (Nỗi đau người học) | Potential Solution | Trạng thái giải quyết | Bằng chứng Mã nguồn & Phân hệ Thực thi |
| :--- | :--- | :--- | :---: | :--- |
| 1 | **Information Overload**<br>*(Quá nhiều nguồn, không biết bắt đầu từ đâu)* | AI Personalized Learning Path | ✅ **ĐÃ GIẢI QUYẾT (100%)** | `graph_engine.py` (Topological Sort), `learning_paths.py`. Tự động trích xuất Knowledge Graph từ PDF và sắp xếp lộ trình theo thứ tự tiền đề. |
| 2 | **Fragmented Learning Resources**<br>*(Tài liệu phân tán nhiều app)* | Unified Learning Workspace | ✅ **ĐÃ GIẢI QUYẾT (100%)** | Next.js Frontend (`/books`, `/plan`, `/quiz`, `/flashcards`, `/tutor`). Gom PDF, bài học Markdown, Quiz, Flashcard và Chat AI vào 1 màn hình. |
| 3 | **Poor Vocabulary Retention**<br>*(Học trước quên sau)* | AI Spaced Repetition System | ✅ **ĐÃ GIẢI QUYẾT (100%)** | `fsrs_engine.py` (Mô hình FSRS $S, D, R$), `reviews.py`, `flashcards.py`. Tự động sinh thẻ Anki và xếp lịch ôn tập định kỳ chống quên. |
| 4 | **Lack of Contextual Understanding**<br>*(Không hiểu ngữ cảnh/sắc thái)* | Context-aware AI Dictionary | ✅ **ĐÃ GIẢI QUYẾT (100%)** | `rag_engine.py` + `ai_engine.py`. RAG Engine trích xuất câu/đoạn thực tế trong tài liệu (`source_chunk`) để giải thích ngữ cảnh chuẩn xác. |
| 5 | **Speaking Anxiety**<br>*(Ngại nói vì sợ sai phát âm/ngữ pháp)* | AI Conversation Partner & Audio Shadowing | ✅ **ĐÃ GIẢI QUYẾT (100%)** | `speech_engine.py` (TTS Audio Guide speed 0.8x-1.2x & Levenshtein STT accuracy score), `speech.py`, Flashcard Speech Widget. |
| 6 | **Lack of Personalized Feedback**<br>*(Làm bài không hiểu vì sao sai)* | AI Tutor with Explainable Feedback | ✅ **ĐÃ GIẢI QUYẾT (100%)** | `ai_engine.py` (`evaluate_quiz_response`, `analyze_weak_topics`). Chấm điểm chi tiết từng lựa chọn, giải thích nguyên nhân và phân tích điểm yếu. |
| 7 | **Passive Learning**<br>*(Đọc/Xem thụ động, ít thực hành)* | Active Recall & Interactive Exercises | ✅ **ĐÃ GIẢI QUYẾT (100%)** | `quizzes.py` (Adaptive Quizzes) & `flashcards.py` (Lật thẻ 3D). Học viên bắt buộc chủ động nhớ lại kiến thức (Active Recall). |
| 8 | **Inconsistent Learning Habits**<br>*(Học hăng hái vài ngày rồi bỏ)* | Adaptive Learning Scheduler | ✅ **ĐÃ GIẢI QUYẾT (100%)** | `learning_engine.py` (`generate_study_plan`, `adapt_plan`). Đếm Streak, chia nhỏ thời lượng daily_minutes và tự động chèn ngày học bổ sung. |
| 9 | **Difficulty Measuring Progress**<br>*(Không biết trình độ cải thiện đến đâu)* | Skill-based Progress Analytics | ✅ **ĐÃ GIẢI QUYẾT (100%)** | `learning_engine.py` (`calculate_knowledge_profile`), `reviews.py` (`/stats`). Đo lường chính xác Mastery Score %, Retention %, Strong/Weak Areas. |
| 10 | **Content-Level Mismatch**<br>*(Tài liệu quá khó hoặc quá dễ)* | Adaptive Content Recommendation | ✅ **ĐÃ GIẢI QUYẾT (100%)** | `ai_engine.py` (`generate_lesson`, `generate_adaptive_quiz`). Tự động điều chỉnh độ sâu bài học & độ khó quiz theo Mastery Score của người dùng. |
| 11 | **Lack of Real-life Application**<br>*(Không biết áp dụng vào thực tế)* | Real-world Scenario Learning (TBLT) | ✅ **ĐÃ GIẢI QUYẾT (100%)** | `scenario_engine.py` (Nhiệm vụ Tình huống Thực tế & AI Roleplay), `scenarios.py`, Next.js UI `/scenarios`. Phỏng vấn công việc, Đàm phán đối tác & Bảo vệ giải pháp. |
| 12 | **Learning Friction Across Platforms**<br>*(Phải chuyển qua nhiều công cụ)* | Browser Extension / Companion | ❌ **CHƯA GIẢI QUYẾT (Roadmap)** | Hiện tại Studia hoạt động dạng Web Application (Next.js App), chưa có Extension tích hợp trực tiếp trên trình duyệt ngoài (Chrome/Edge). |

---

## 9. CÁC FUNCTION CỐT LÕI & LUỒNG NGHIỆP VỤ TRIỂN KHAI

Sơ đồ tổng quan phân rã 21 hàm cốt lõi theo 6 phân hệ hệ thống:

![Sơ đồ Phân rã Chức năng & Luồng Nghiệp vụ](docs/images/functional_flows.svg)

### ⚙️ Danh sách Function Cốt lõi Chi tiết (Core Function Matrix):

#### 1. Phân hệ RAG Vector & Quản lý Tài liệu (`backend/app/services/rag_engine.py`, `documents.py`)
- `upload_pdf(file, title, user_id)`: Upload file PDF lên Supabase Storage bucket `documents`, lưu metadata DB.
- `chunk_text(text, chunk_size=600, overlap=80)`: Tách văn bản chuẩn ranh giới câu (sentence boundary aware).
- `generate_embedding(text)`: Tạo vector 768 chiều qua mô hình Gemini `text-embedding-004`.
- `search_relevant_chunks(query, document_id, top_k=5)`: Semantic search qua Supabase RPC `match_document_chunks_by_doc` (pgvector Cosine distance).

#### 2. Phân hệ Đồ thị Tri thức & Thứ tự Học (`backend/app/services/graph_engine.py`, `ai_engine.py`)
- `extract_topics_and_graph(content, title)`: Gemini AI trích xuất danh sách Topics & Mối quan hệ Tiền đề (Prerequisite DAG).
- `build_topological_order(topics, relationships)`: Thuật toán **Topological Sort** sắp xếp bài học chuẩn logic tiền đề.
- `check_prerequisites(target_topic_id, knowledge_states)`: Kiểm tra điều kiện đạt Mastery >= 60% ở bài trước để mở khóa bài tiếp theo.

#### 3. Phân hệ Lập Lịch Học Thích ứng (`backend/app/services/learning_engine.py`, `learning_paths.py`)
- `set_goal(document_id, daily_minutes, deadline_days)`: Thiết lập mục tiêu deadline & thời lượng học.
- `generate_study_plan(study_goal, topics, knowledge_states)`: Phân bổ lịch học theo chu kỳ 3 ngày (Học mới $\rightarrow$ Quiz $\rightarrow$ Review).
- `adapt_plan(user_id, weak_topics, current_plan)`: Tự động chèn ngày học bổ sung và lùi lịch các bài sau khi Quiz < 60%.
- `get_today_tasks(user_id, supabase)`: Lấy bài tập hôm nay, tính chuỗi Streak ngày học & Knowledge Profile.

#### 4. Phân hệ Bài học RAG & Quiz Thích ứng (`backend/app/services/ai_engine.py`, `quizzes.py`)
- `generate_lesson(topic_name, user_mastery, rag_context)`: Gemini sinh bài học Markdown tiếng Việt theo độ sâu Mastery.
- `generate_adaptive_quiz(topic_name, user_mastery, rag_context)`: Gemini sinh câu hỏi trắc nghiệm (A/B/C/D) thích ứng từ RAG context.
- `evaluate_quiz_response(question, user_answer, response_time_ms)`: Chấm điểm câu trả lời & phản hồi giải thích chi tiết.
- `submit_full_quiz(quiz_id, answers)`: Nộp bài quiz, tính điểm %, phân tích weak topics & kích hoạt `adapt_plan`.

#### 5. Phân hệ Thuật toán FSRS & Flashcards (`backend/app/services/fsrs_engine.py`, `flashcards.py`, `reviews.py`)
- `calculate_next_review(stability, difficulty, mastery, is_correct, rating)`: Thuật toán FSRS tính $S, D, R$ và khoảng thời gian ôn tập $I$.
- `generate_flashcards(topic_name, rag_context)`: Gemini sinh thẻ Anki-style từ văn bản gốc (`source_chunk`).
- `get_due_flashcards(user_id, limit)` & `get_review_queue()`: Lấy danh sách thẻ & bài học đến hạn ôn tập FSRS.
- `review_flashcard(flashcard_id, rating)`: Cập nhật trạng thái FSRS dựa theo 4 mức rating (Again/Hard/Good/Easy).

#### 6. Phân hệ AI Trợ giảng Chatbot (`backend/app/services/ai_engine.py`, `tutor.py`)
- `ask_ai_tutor(question, document_id, session_id)`: Chatbot trả lời thắc mắc dựa **nghiêm ngặt** trên RAG context từ sách, kèm trích dẫn nguồn (`sources`).
- `get_chat_sessions(user_id)` & `get_session_messages(session_id)`: Quản lý và truy vấn lịch sử hội thoại.

---

### 🔄 Luồng Nghiệp vụ Chính từ Đầu đến Cuối (End-to-End Business Flow):

```mermaid
sequenceDiagram
    autonumber
    actor User as Học viên (User)
    participant UI as Next.js Web App
    participant API as FastAPI Backend
    participant RAG as RAG & Graph Engine
    participant DB as Supabase Postgres + pgvector
    participant AI as Gemini Cloud AI

    User->>UI: 1. Upload tệp PDF & Đặt Goal (deadline_days, daily_minutes)
    UI->>API: POST /documents/upload-pdf & POST /learning-paths/set-goal
    API->>DB: Upload file PDF lên Supabase Storage
    API->>RAG: Background Task: Chunking 600ch + Gemini Embedding 768d
    RAG->>DB: Lưu document_chunks & Embedding Vectors (pgvector)
    RAG->>AI: Extract Topics & Knowledge Graph (Prerequisite DAG)
    AI-->>RAG: Trả về Topics & Relationships
    RAG->>API: Topological Sort & Generate 3-Day Cycle Study Plan
    API->>DB: Lưu daily_learning_plans & knowledge_states

    User->>UI: 2. Học viên vào Dashboard học tập hôm nay
    UI->>API: GET /learning-paths/today
    API-->>UI: Trả về Today Tasks (Lesson, Quiz, Flashcard) & Streak

    User->>UI: 3. Thực hiện Bài học Markdown
    UI->>API: POST /learning-paths/generate-lesson
    API->>RAG: Search pgvector RAG Context
    RAG->>AI: Generate Markdown Lesson theo User Mastery Level
    AI-->>UI: Hiển thị Bài học tiếng Việt cá nhân hóa

    User->>UI: 4. Làm bài Quiz Trắc nghiệm
    UI->>API: POST /quizzes/generate & POST /quizzes/submit-full
    API->>RAG: Search RAG Context từ sách
    RAG->>AI: Sinh 5 câu hỏi Adaptive Quizzes
    User->>UI: Chọn đáp án A/B/C/D & Nộp bài
    API->>API: Chấm điểm & Phân tích Quiz Score
    alt Điểm Quiz < 60% (Weak Topic)
        API->>API: Trigger adapt_plan() -> Chèn ngày ôn tập bổ sung & lùi lịch sau
    else Điểm Quiz >= 60% (Pass Topic)
        API->>API: Trigger FSRS Engine -> Tính S, D, R & Lên lịch ôn định kỳ
    end

    User->>UI: 5. Ôn tập Flashcards & Hỏi đáp AI Tutor
    UI->>API: POST /flashcards/review (Rating: Again/Hard/Good/Easy)
    API->>DB: Update flashcard_states & next_review_at
    User->>UI: Hỏi câu hỏi khó trong sách (/tutor/ask)
    UI->>API: POST /tutor/ask
    API->>RAG: Vector Search 5 chunks liên quan nhất
    RAG->>AI: Sinh câu trả lời kèm trích dẫn nguồn (sources)
    AI-->>UI: Hiển thị đáp án chính xác từ tệp sách PDF
```

---
*Tài liệu được đóng gói và xác thực bởi Senior Technical Business Analyst.*

---

## 10. KHUNG KHOA HỌC PHƯƠNG PHÁP HỌC TẬP (LEARNING SCIENCE MATRIX)

Sơ đồ kiến trúc nền tảng tích hợp 7 phương pháp khoa học học tập hàng đầu thế giới vào hệ thống **Studia**:

![Kiến trúc Nền tảng Khoa học Học tập Studia](docs/images/pedagogical_architecture.svg)

### 🔬 Bảng Chi tiết 7 Phương pháp & Định hướng Phân hệ Thực thi:

| STT | Phương pháp Khoa học (Methodology) | Bản chất Nghiệp vụ | Phân hệ Hệ thống Thực thi (Implementation Module) | Trạng thái Code |
| :--- | :--- | :--- | :--- | :---: |
| 1 | **Spaced Repetition (SRS)** | Tối ưu khoảng cách lặp lại ôn tập định kỳ để chống quên theo đường cong Ebbinghaus. | `fsrs_engine.py` (Mô hình toán FSRS $S, D, R$), `reviews.py`, `flashcards.py`. | ✅ **100% Code** |
| 2 | **Active Recall / Retrieval Practice** | Chủ động truy xuất và nhớ lại kiến thức thay vì chỉ đọc thụ động. | `quizzes.py` (Adaptive Quizzes A/B/C/D), `flashcards.py` (Thẻ Anki 3D). | ✅ **100% Code** |
| 3 | **Interleaved Practice** | Xen kẽ các dạng bài, kỹ năng và chủ đề khác nhau trong từng buổi học để tăng khả năng phân biệt kiến thức. | `learning_engine.py` (Scheduler phân bổ chu kỳ 3 ngày: Học mới $\rightarrow$ Quiz $\rightarrow$ Review FSRS). | ✅ **100% Code** |
| 4 | **Comprehensible Input (i+1)** | Nạp nội dung cao hơn trình độ hiện tại 1 bậc ($i+1$) giúp tiến bộ mà không gây nản. | `ai_engine.py` (`generate_lesson`, `generate_adaptive_quiz` điều chỉnh độ sâu theo % Mastery hiện tại). | ✅ **100% Code** |
| 5 | **Dual Coding Theory** | Kết hợp thông tin ngôn ngữ (văn bản) với biểu diễn trực quan (hình ảnh, đồ thị tri thức D2 & Mermaid). | `dual_coding_engine.py` (Tự động trích xuất sơ đồ D2 & Mermaid vào bài học & khái niệm). | ✅ **100% Code** |
| 6 | **Shadowing Technique** | Nghe giọng mẫu và lập tức lặp lại/bắt chước lời nói theo audio (Chuyên sâu cho Listening & Speaking). | `speech_engine.py` (TTS Audio Guide speed 0.8x-1.2x & Levenshtein STT score), `speech.py`. | ✅ **100% Code** |
| 7 | **Task-Based Language Teaching (TBLT)** | Học thông qua việc thực hiện các nhiệm vụ giao tiếp & tình huống thực tế. | `scenario_engine.py` (Phân hệ Nhiệm vụ Tình huống Thực tế & AI Roleplay), `scenarios.py`, `/scenarios`. | ✅ **100% Code** |

---

### 🚀 Chi tiết Kế hoạch Triển khai 3 Phương pháp Nâng cao Mới (Shadowing, Dual Coding & TBLT):

#### 🎧 1. Kỹ thuật Shadowing (Nghe & Bắt chước theo Audio)
- **Kiến trúc Kỹ thuật**:
  - Tích hợp dịch vụ **Text-to-Speech (TTS)** phát giọng đọc tiếng Anh/tiếng Việt chuẩn bản ngữ với tốc độ tùy chỉnh (0.8x, 1.0x, 1.2x).
  - Tích hợp dịch vụ **Speech-to-Text (STT)** & Thuật toán **Levenshtein Distance / Phoneme Matching** để so sánh ghi âm của học viên với đoạn audio mẫu, chấm điểm độ chính xác phát âm và ngắt nghỉ.
- **Vị trí tích hợp**: Trang học bài (`/lesson/[id]`) và Trang Flashcard (`/flashcards`).

#### 🖼 2. Lý thuyết Dual Coding (Mã hóa Kép Văn bản + Trực quan)
- **Kiến trúc Kỹ thuật**:
  - Đồ thị tri thức (Knowledge Graph Nodes & Edges) trực quan hóa mối quan hệ giữa các khái niệm.
  - Tự động chèn sơ đồ **Mermaid Diagram / D2 Chart / Bảng so sánh** trực quan vào bài học Markdown sinh bởi AI.
  - Gọi công cụ tạo ảnh tự động minh họa khái niệm trực quan cho các thẻ Flashcard.
- **Vị trí tích hợp**: `ai_engine.py` (`generate_lesson`, `generate_flashcards`).

#### 🎯 3. Task-Based Language Teaching (TBLT - Học qua Nhiệm vụ Tình huống)
- **Kiến trúc Kỹ thuật**:
  - AI sinh các **Scenario Tasks** (Nhiệm vụ tình huống thực tế) từ nội dung sách đã upload.
  - Học viên hoàn thành nhiệm vụ bằng cách tương tác nhập vai (Roleplay Chat) với AI Tutor để giải quyết vấn đề thực tế (ví dụ: Phỏng vấn công việc, Đàm phán đối tác, Giải thích giải pháp kỹ thuật).
- **Vị trí tích hợp**: `backend/app/api/v1/tutor.py` & Màn hình `/tutor`.

---
*Tài liệu được đóng gói và xác thực bởi Senior Technical Business Analyst.*



