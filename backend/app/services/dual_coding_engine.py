"""
Dual Coding Engine — Studia v2
Triển khai Phương pháp Khoa học Dual Coding Theory (Mã hóa Kép Văn bản + Trực quan)
Tự động trích xuất sơ đồ Mermaid & D2 Diagram minh họa khái niệm trực quan cho Bài học Markdown & Flashcards.
"""
from typing import Dict, List, Any, Optional
import re
import logging
from app.services.ai_engine import _call_gemini

logger = logging.getLogger(__name__)


class DualCodingEngine:
    """
    Engine phục vụ Dual Coding Theory:
    - generate_mermaid_diagram: Sinh sơ đồ Mermaid (Flowchart / Mindmap / Sequence)
    - generate_d2_diagram: Sinh sơ đồ D2 Terrastruct với tiếng Việt có dấu
    - enrich_lesson_with_visuals: Chèn sơ đồ trực quan vào nội dung bài học Markdown
    """

    @staticmethod
    def generate_mermaid_diagram(topic_name: str, concept_description: str) -> str:
        """
        Sinh mã nguồn Mermaid diagram minh họa cho chủ đề.
        """
        prompt = f"""You are a visual design expert creating Mermaid diagrams for education.

Topic: "{topic_name}"
Description: {concept_description[:1000]}

Generate a clean, readable Mermaid diagram (graph TD or mindmap) illustrating the concept.
Return ONLY valid JSON:
{{
  "mermaid_code": "graph TD\\n  A[Khái niệm] --> B[Nguyên lý]\\n  B --> C[Ứng dụng]"
}}

Rules:
- Keep node labels in Vietnamese
- Quote node labels containing special characters or spaces (e.g. A["Tên node"])
- Keep diagram concise (4-8 nodes max)"""

        result = _call_gemini(prompt, expect_json=True)

        if result and "mermaid_code" in result:
            return result["mermaid_code"]

        # Fallback Mermaid diagram
        clean_topic = re.sub(r'["\n]', '', topic_name)
        return f"""graph TD
  A["📘 {clean_topic}"] --> B["⚙️ Nguyên lý Cốt lõi"]
  A --> C["💡 Ứng dụng Thực tế"]
  B --> D["🎯 Mục tiêu Thành thạo"]
  C --> D"""

    @staticmethod
    def generate_d2_diagram(topic_name: str, concept_description: str) -> str:
        """
        Sinh mã nguồn D2 (Terrastruct) diagram hỗ trợ tiếng Việt có dấu & style nền trắng.
        """
        prompt = f"""You are a visual architect creating D2 (Terrastruct) diagrams for study materials.

Topic: "{topic_name}"
Description: {concept_description[:1000]}

Generate D2 script code for a visual diagram.
Return ONLY valid JSON:
{{
  "d2_code": "vars: {{ theme-id: 0 }}\\nKhái niệm: {{ \\n  style.fill: \\"#ffffff\\" \\n}}\\nKhái niệm -> Nguyên lý: \\"Phát triển\\" "
}}

Rules:
- Use theme-id: 0 (white background)
- Use proper Vietnamese text with accents inside double quotes
- Create clear node relationships"""

        result = _call_gemini(prompt, expect_json=True)

        if result and "d2_code" in result:
            return result["d2_code"]

        # Fallback D2 diagram
        clean_topic = re.sub(r'["\n]', '', topic_name)
        return f"""direction: right
vars: {{
  theme-id: 0
}}

"Chủ đề: {clean_topic}": {{
  style.fill: "#ffffff"
  style.stroke: "#2563eb"
  style.font-color: "#1e293b"
}}

"Chủ đề: {clean_topic}" -> "Cơ sở Lý thuyết": "Nền tảng"
"Chủ đề: {clean_topic}" -> "Quy trình Thực hành": "Triển khai"
"Cơ sở Lý thuyết" -> "Đánh giá Năng lực (Quiz)": "Kiểm tra"
"Quy trình Thực hành" -> "Đánh giá Năng lực (Quiz)": "Củng cố"
"""

    @staticmethod
    def enrich_lesson_with_visuals(topic_name: str, content_markdown: str) -> str:
        """
        Tự động bổ sung sơ đồ trực quan (Dual Coding) vào nội dung Markdown của bài học.
        """
        if "```mermaid" in content_markdown or "```d2" in content_markdown:
            return content_markdown

        mermaid_code = DualCodingEngine.generate_mermaid_diagram(topic_name, content_markdown[:800])

        visual_section = f"""

## 🎨 Sơ đồ Trực quan Khái niệm (Dual Coding)

```mermaid
{mermaid_code}
```

"""
        # Chèn sơ đồ ngay sau phần Giới thiệu hoặc sau heading đầu tiên
        if "## " in content_markdown:
            parts = content_markdown.split("## ", 1)
            return parts[0] + "## " + parts[1] + visual_section
        else:
            return content_markdown + visual_section
