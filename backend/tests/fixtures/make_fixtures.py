"""
Sinh PDF mẫu cho test pipeline PDF → ebook → đề thi (xem docs/PLAN_PDF_EBOOK_EXAM.md).

    python tests/fixtures/make_fixtures.py [out_dir]

Tạo 3 tệp PDF + tệp `<tên>.expected.json` mô tả nội dung đúng để test đối chiếu:
- text_book.pdf   6 trang, 3 chương, header/footer lặp, 1 bảng, 1 từ bị ngắt dòng, 1 trang 2 cột
- scanned.pdf     2 trang chỉ có ảnh (không có text layer)
- mini_ielts.pdf  1 đề đủ Listening 40 câu, Reading 3 passage 40 câu, Writing, Speaking, đáp án, audioscript

Toàn bộ nội dung là văn bản tự viết cho mục đích kiểm thử.
"""
import io
import json
import os
import re
import sys
from datetime import datetime, timezone

from fpdf import FPDF
from PIL import Image, ImageDraw, ImageFont

CREATED = datetime(2026, 1, 1, tzinfo=timezone.utc)


class Doc(FPDF):
    """Trang A4 có header/footer lặp lại trên mọi trang."""

    def __init__(self, header_text: str):
        super().__init__(format="A4")
        self.header_text = header_text
        self.set_margins(20, 15, 20)
        self.set_auto_page_break(True, margin=20)
        self.set_creation_date(CREATED)

    def header(self):
        self.set_font("Helvetica", "", 8)
        self.cell(0, 6, self.header_text, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 8)
        self.cell(0, 6, f"Page {self.page_no()}", align="C")

    def heading(self, text: str, size: int):
        self.set_font("Helvetica", "B", size)
        self.multi_cell(0, size * 0.55, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def para(self, text: str, style: str = "", size: int = 11, gap: float = 3):
        self.set_font("Helvetica", style, size)
        self.multi_cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(gap)

    def line(self, text: str, style: str = "", size: int = 11):
        self.set_font("Helvetica", style, size)
        self.multi_cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")


def _write_expected(pdf_path: str, expected: dict) -> dict:
    with open(os.path.splitext(pdf_path)[0] + ".expected.json", "w", encoding="utf-8") as f:
        json.dump(expected, f, ensure_ascii=False, indent=2)
    return expected


# ============================================================
# 1. text_book.pdf
# ============================================================

TEXT_BOOK_HEADER = "Studia Sample Textbook"
TEXT_BOOK_TABLE = [
    ["Review", "Interval", "Typical recall"],
    ["First", "1 day", "90 percent"],
    ["Second", "3 days", "85 percent"],
    ["Third", "7 days", "80 percent"],
]
TEXT_BOOK_HYPHEN_LINES = [
    "Researchers describe this as spaced repetition, a method in which learn-",
    "ing sessions are separated by gradually increasing intervals of time.",
]
TEXT_BOOK_LIST = [
    "Close the book before you try to answer.",
    "Write the answer in your own words.",
    "Check the source only after you have finished.",
]
TEXT_BOOK_LEFT_COLUMN = [
    "LEFTCOL-ONE Mixing related topics in one session feels harder than studying them one at a time, "
    "and learners usually rate it as less effective.",
    "LEFTCOL-TWO Test results tell a different story. When the final exam mixes question types, "
    "students who practised in mixed order choose the right method more often.",
]
TEXT_BOOK_RIGHT_COLUMN = [
    "RIGHTCOL-ONE The explanation is that mixed practice forces the learner to decide which idea "
    "applies before using it, a step that blocked practice quietly removes.",
    "RIGHTCOL-TWO A sensible routine therefore begins with a short block of one topic and moves to "
    "mixed sets as soon as the basic procedure is understood.",
]


def build_text_book(path: str) -> dict:
    pdf = Doc(TEXT_BOOK_HEADER)

    # Trang 1-2: Chương 1
    pdf.add_page()
    pdf.heading("Chapter 1: How Memory Works", 18)
    pdf.heading("1.1 Encoding", 13)
    pdf.para("New information enters memory through attention. A learner who reads a page while thinking "
             "about something else may recognise the words later but will struggle to explain them. "
             "Encoding improves when the material is connected to something the learner already knows.")
    pdf.para("Examples are the simplest form of connection. An abstract rule is easier to keep when it is "
             "attached to a concrete case, and easier still when the learner invents the case personally.")
    pdf.heading("1.2 Storage", 13)
    pdf.para("Stored memories are not fixed records. Each time a memory is recalled it is rebuilt, and the "
             "rebuilt version replaces the earlier one. This is why recalling a fact strengthens it more "
             "than reading it again.")
    pdf.add_page()
    pdf.heading("1.3 Forgetting", 13)
    pdf.para("Forgetting follows a predictable curve. Most of the loss happens in the first day, after "
             "which the rate slows. A review placed shortly before the point of forgetting resets the "
             "curve at a gentler slope.")
    pdf.para("The practical lesson is that timing matters more than total hours. Two short reviews on "
             "different days protect a memory better than one long session on a single day.")

    # Trang 3-4: Chương 2 (bảng + từ ngắt dòng + danh sách)
    pdf.add_page()
    pdf.heading("Chapter 2: Spaced Repetition", 18)
    pdf.heading("2.1 The Spacing Effect", 13)
    pdf.set_font("Helvetica", "", 11)
    for hyphen_line in TEXT_BOOK_HYPHEN_LINES:
        pdf.cell(0, 6, hyphen_line, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.para("The intervals in the table below are a common starting point. They are adjusted for each "
             "learner according to how easily the answer was recalled.")
    pdf.set_font("Helvetica", "", 10)
    with pdf.table(col_widths=(40, 40, 50), width=130, align="LEFT") as table:
        for row_cells in TEXT_BOOK_TABLE:
            row = table.row()
            for cell_text in row_cells:
                row.cell(cell_text)
    pdf.ln(4)
    pdf.add_page()
    pdf.heading("2.2 Active Recall", 13)
    pdf.para("Spacing works best when each review is a test and not a second reading. Three habits make "
             "recall practice effective:")
    for item in TEXT_BOOK_LIST:
        pdf.line(f"- {item}")
    pdf.ln(3)
    pdf.para("Errors made during recall are useful. A wrong answer followed by the correct one is "
             "remembered better than a correct answer that was simply read.")

    # Trang 5-6: Chương 3 (trang 6 chia 2 cột)
    pdf.add_page()
    pdf.heading("Chapter 3: Interleaving", 18)
    pdf.heading("3.1 Blocked and Mixed Practice", 13)
    pdf.para("In blocked practice a learner repeats one type of problem until it feels easy, then moves "
             "to the next type. In mixed practice the types are shuffled so that each problem must first "
             "be identified.")
    pdf.para("Blocked practice produces fast improvement during the session. Mixed practice produces "
             "slower improvement that lasts longer.")
    pdf.add_page()
    pdf.heading("3.2 Evidence", 13)
    top = pdf.get_y()
    pdf.set_font("Helvetica", "", 10)
    for x, column in ((20, TEXT_BOOK_LEFT_COLUMN), (110, TEXT_BOOK_RIGHT_COLUMN)):
        pdf.set_xy(x, top)
        for text in column:
            pdf.set_x(x)
            pdf.multi_cell(80, 5.5, text, new_x="LEFT", new_y="NEXT")
            pdf.ln(3)

    assert pdf.page_no() == 6, f"text_book.pdf must have 6 pages, got {pdf.page_no()}"
    pdf.output(path)
    return _write_expected(path, {
        "page_count": 6,
        "header": TEXT_BOOK_HEADER,
        "footer_pattern": "Page N",
        "chapters": [
            {"title": "Chapter 1: How Memory Works", "page": 1},
            {"title": "Chapter 2: Spaced Repetition", "page": 3},
            {"title": "Chapter 3: Interleaving", "page": 5},
        ],
        "sections": ["1.1 Encoding", "1.2 Storage", "1.3 Forgetting", "2.1 The Spacing Effect",
                     "2.2 Active Recall", "3.1 Blocked and Mixed Practice", "3.2 Evidence"],
        "table": {"page": 3, "rows": TEXT_BOOK_TABLE},
        "hyphenated": {"page": 3, "joined_word": "learning", "broken_forms": ["learn-", "learn- ing"]},
        "list_items": {"page": 4, "items": TEXT_BOOK_LIST},
        "two_column": {"page": 6, "reading_order": ["LEFTCOL-ONE", "LEFTCOL-TWO", "RIGHTCOL-ONE", "RIGHTCOL-TWO"]},
    })


# ============================================================
# 2. scanned.pdf
# ============================================================

SCANNED_PAGES = [
    [
        "Field Notes on Tidal Pools",
        "",
        "A tidal pool is a small body of sea water left behind",
        "when the tide goes out. Although it looks calm, the",
        "pool changes quickly. Its temperature can rise by ten",
        "degrees in a single afternoon, and rain may dilute",
        "the salt within minutes.",
        "",
        "Animals that live here must tolerate these swings.",
        "Limpets seal themselves against the rock, while small",
        "fish hide beneath weed until the sea returns.",
    ],
    [
        "Recording Observations",
        "",
        "Visit the same pool at low tide on three different",
        "days. Count the species you can see without moving",
        "any stones. Note the time, the weather and the height",
        "of the water above the lowest rock.",
        "",
        "Compare your three records. Species that appear every",
        "time are residents. Those seen only once were probably",
        "carried in by the last high tide.",
    ],
]


def build_scanned(path: str) -> dict:
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(False)
    pdf.set_creation_date(CREATED)
    title_font = ImageFont.load_default(size=44)
    body_font = ImageFont.load_default(size=32)

    for lines in SCANNED_PAGES:
        image = Image.new("RGB", (1240, 1754), "white")  # A4 @ 150 DPI
        draw = ImageDraw.Draw(image)
        y = 140
        for i, text in enumerate(lines):
            draw.text((110, y), text, fill="black", font=title_font if i == 0 else body_font)
            y += 78 if i == 0 else 52
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)
        pdf.add_page()
        pdf.image(buffer, x=0, y=0, w=210, h=297)

    pdf.output(path)
    return _write_expected(path, {
        "page_count": 2,
        "has_text_layer": False,
        "pages": [{"page": i + 1, "text": " ".join(line for line in lines if line)}
                  for i, lines in enumerate(SCANNED_PAGES)],
    })


# ============================================================
# 3. mini_ielts.pdf
# ============================================================

TFNG = ["TRUE", "FALSE", "NOT GIVEN"]
YNNG = ["YES", "NO", "NOT GIVEN"]

LISTENING = [
    {"part": 1, "groups": [
        {"type": "note_completion", "range": (1, 10),
         "instruction": "Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.",
         "title": "Riverside Community Garden - New Member Enquiry",
         "questions": [
             (1, "Annual membership fee: ______ pounds", "25"),
             (2, "Garden is open to members every day except ______", "Monday"),
             (3, "Each new member receives a small ______ for tools", "locker"),
             (4, "Introductory session: the first ______ of each month", "Saturday"),
             (5, "Members must bring their own ______", "gloves"),
             (6, "Rain water is collected from the roof in a large ______", "tank"),
             (7, "Coordinator's surname: ______", "Hallam"),
             (8, "Contact number: 0161 ______", "5550142"),
             (9, "Nearest bus stop: outside the ______", "library"),
             (10, "Next open day: 14th ______", "June"),
         ]},
    ]},
    {"part": 2, "groups": [
        {"type": "multiple_choice", "range": (11, 14),
         "instruction": "Choose the correct letter, A, B or C.",
         "title": "Holloway Science Museum",
         "questions": [
             (11, "The museum building was originally", ["a railway station.", "a textile factory.", "a town hall."], "B"),
             (12, "What is new at the museum this year?", ["an evening opening", "a cafe on the roof", "a children's workshop"], "C"),
             (13, "Visitors are advised to begin their visit", ["on the top floor.", "in the main hall.", "in the garden."], "A"),
             (14, "Photography is not allowed", ["in the temporary exhibition.", "anywhere in the museum.", "in the main hall."], "A"),
         ]},
        {"type": "matching_features", "range": (15, 20),
         "instruction": "What does the guide say about each gallery? Choose SIX answers from the box and "
                        "write the correct letter, A-H, next to Questions 15-20.",
         "options": ["closed for repairs", "best for young children", "requires a timed ticket",
                     "has a new audio guide", "very busy at weekends", "recently extended",
                     "free talks every hour", "suitable for a short visit"],
         "questions": [
             (15, "Space Gallery", "C"), (16, "Ocean Room", "B"), (17, "Energy Hall", "F"),
             (18, "Medicine Gallery", "G"), (19, "Transport Shed", "A"), (20, "Mathematics Corner", "H"),
         ]},
    ]},
    {"part": 3, "groups": [
        {"type": "multiple_select", "range": (21, 22), "any_order": True,
         "instruction": "Choose TWO letters, A-E.",
         "stem": "Which TWO problems did the students have with their first questionnaire?",
         "options": ["It was too long.", "The wording was unclear.", "Too few people replied.",
                     "It reached the wrong age group.", "There were technical faults."],
         "answers": ["B", "C"]},
        {"type": "multiple_choice", "range": (23, 26),
         "instruction": "Choose the correct letter, A, B or C.",
         "questions": [
             (23, "Their tutor suggested that they should", ["interview fewer people.", "add open questions.", "change the topic."], "B"),
             (24, "Maya thinks the results section should", ["include more charts.", "be shortened.", "be written first."], "A"),
             (25, "What will Daniel do before the next meeting?", ["contact the library", "rewrite the introduction", "check the references"], "C"),
             (26, "They agree that the presentation should", ["last ten minutes.", "avoid statistics.", "begin with an example."], "C"),
         ]},
        {"type": "sentence_completion", "range": (27, 30),
         "instruction": "Complete the sentences below. Write ONE WORD ONLY for each answer.",
         "questions": [
             (27, "The final report must be submitted by the end of ______.", "April"),
             (28, "Each student has to write a personal ______ about the project.", "reflection"),
             (29, "The students will practise their talk in the ______ room.", "seminar"),
             (30, "Their tutor wants to see a ______ of the slides first.", "draft"),
         ]},
    ]},
    {"part": 4, "groups": [
        {"type": "note_completion", "range": (31, 40),
         "instruction": "Complete the notes below. Write ONE WORD ONLY for each answer.",
         "title": "A Short History of the Pencil",
         "questions": [
             (31, "Roman writers used a thin rod made of ______", "lead"),
             (32, "A large deposit of graphite was exposed in England after a ______", "storm"),
             (33, "Local farmers used graphite to mark their ______", "sheep"),
             (34, "Graphite sticks were first wrapped in ______", "string"),
             (35, "Wooden cases were introduced by craftsmen in ______", "Italy"),
             (36, "A French inventor mixed powdered graphite with ______", "clay"),
             (37, "Hardness depends on the ______ of the two materials", "ratio / proportion"),
             (38, "The first attached erasers were made of ______", "rubber"),
             (39, "Many pencils are painted ______ to suggest quality", "yellow"),
             (40, "Some modern pencils are made from recycled ______", "paper"),
         ]},
    ]},
]

PASSAGE_1 = {
    "title": "The Return of the Urban Beekeeper",
    "paragraphs": [
        "For most of the twentieth century, keeping bees was regarded as a rural pursuit. Hives belonged in "
        "orchards and meadows, far from traffic and concrete. Yet over the past two decades a quiet change has "
        "taken place. Rooftops, schoolyards and disused railway land in many large cities now host thousands of "
        "colonies, and membership of urban beekeeping associations has grown steadily in every region where "
        "records are kept.",
        "Several factors explain this revival. Cities turn out to be surprisingly generous places for bees. "
        "Parks, private gardens and tree-lined streets provide a wide variety of flowering plants from early "
        "spring until late autumn, whereas farmland is frequently dominated by a single crop that blooms for "
        "only a few weeks. Urban areas are also slightly warmer than the surrounding countryside, which "
        "lengthens the season during which bees can forage.",
        "The movement has not been driven by honey alone. Many new beekeepers say that they were motivated by "
        "reports of declining insect numbers and wanted to do something practical in response. Others were "
        "attracted by the calm, methodical nature of the work. A survey carried out by a national association "
        "found that fewer than one in five members sold any of the honey they produced; most gave it away to "
        "neighbours or kept it for their own families.",
        "Not everyone has welcomed the trend. Ecologists point out that honeybees are only one of several "
        "hundred bee species, and that a dense population of managed hives may compete with wild pollinators "
        "for limited nectar. In one district the number of registered hives doubled within six years, while the "
        "area of flowering land stayed the same. Researchers there recorded fewer visits by solitary bees to the "
        "plants they studied, although they were careful to note that other causes could not be ruled out.",
        "In response, a number of associations have changed the advice they give. Instead of encouraging every "
        "interested resident to buy a hive, they now recommend planting nectar-rich flowers, leaving patches of "
        "bare soil for ground-nesting species and avoiding chemical sprays. Training courses have also become "
        "longer. A beginner who once received a single afternoon of instruction is now expected to attend "
        "classes throughout a full season and to work alongside an experienced mentor before taking charge of a "
        "colony.",
        "Whether the number of city hives continues to rise will depend partly on regulation. A few local "
        "councils have introduced limits on the number of colonies permitted on a single site, and others "
        "require beekeepers to register their hives so that outbreaks of disease can be traced quickly. "
        "Supporters of these measures argue that a smaller number of well-managed colonies is better for bees of "
        "every kind than a large number of neglected ones.",
    ],
    "groups": [
        {"type": "true_false_ng", "range": (1, 7),
         "instruction": "Do the following statements agree with the information given in Reading Passage 1? "
                        "Write TRUE if the statement agrees with the information, FALSE if the statement "
                        "contradicts the information, NOT GIVEN if there is no information on this.",
         "questions": [
             (1, "Beekeeping was mainly considered a countryside activity in the twentieth century.", "TRUE"),
             (2, "Urban beekeeping associations have lost members in some regions.", "FALSE"),
             (3, "Farmland usually offers bees a longer flowering season than cities do.", "FALSE"),
             (4, "Warmer city temperatures give bees more time to collect food.", "TRUE"),
             (5, "Most association members earn a regular income from selling honey.", "FALSE"),
             (6, "Honeybees are the most common bee species in Europe.", "NOT GIVEN"),
             (7, "Researchers proved that managed hives caused the fall in visits by solitary bees.", "FALSE"),
         ]},
        {"type": "sentence_completion", "range": (8, 13),
         "instruction": "Complete the sentences below. Choose ONE WORD ONLY from the passage for each answer.",
         "questions": [
             (8, "City parks and gardens offer bees a wide ______ of flowering plants.", "variety"),
             (9, "Some new beekeepers were drawn to the ______, methodical nature of the work.", "calm"),
             (10, "Most members gave their honey to ______ or kept it at home.", "neighbours"),
             (11, "Associations advise leaving areas of bare ______ for ground-nesting species.", "soil"),
             (12, "A beginner is now expected to work with an experienced ______.", "mentor"),
             (13, "Some councils require beekeepers to ______ their hives.", "register"),
         ]},
    ],
}

PASSAGE_2 = {
    "title": "How Cities Learned to Cool Themselves",
    "lettered": True,
    "paragraphs": [
        "Anyone who has walked from a shaded park into a paved square on a summer afternoon has felt the "
        "difference that surfaces make. Dark roads and roofs absorb sunlight during the day and release it "
        "slowly after dark, so that a city centre can remain several degrees warmer than nearby farmland "
        "throughout the night. This effect was first measured systematically in the early nineteenth century, "
        "when an amateur scientist compared thermometer readings taken inside and outside London over a period "
        "of years. His notebooks, largely ignored at the time, are now regarded as the foundation of urban "
        "climate research.",
        "For a long time the usual answer to urban heat was mechanical. As air conditioning became affordable, "
        "offices, shops and eventually homes were sealed and cooled by machines. The approach worked indoors, "
        "but it carried a hidden cost. Every cooling unit removes heat from a building and expels it into the "
        "street, and the electricity it consumes is often generated by burning fuel. In the hottest weeks, "
        "demand for power rises so sharply that supply networks sometimes fail altogether.",
        "Planners have therefore returned to older, simpler methods. Trees are the most familiar of these. A "
        "mature tree shades the ground beneath it and also cools the air as water evaporates from its leaves. "
        "Studies comparing neighbouring streets have found that those lined with large trees are noticeably "
        "cooler at midday than those without. The difficulty is time: a newly planted tree may need twenty "
        "years to provide meaningful shade, and many young trees do not survive their first dry summer. For "
        "this reason, protecting existing trees is usually more effective than planting new ones.",
        "Faster results can be obtained by changing the colour of the city itself. Roofs coated with pale, "
        "reflective paint send much of the sun's energy back into the sky instead of absorbing it. Some "
        "authorities now offer grants to owners who repaint flat roofs, and a few have tested lighter road "
        "surfaces as well. Results from roads have been mixed, however, because reflected light can make "
        "pedestrians feel hotter even while the surface below them stays cool.",
        "Water offers a third possibility. Fountains, canals and restored streams cool their surroundings, and "
        "they are popular with residents. In several cities, rivers that were covered by roads in the last "
        "century have been uncovered again, creating corridors along which cooler air can flow. Such projects "
        "are expensive and slow, and they require cooperation between departments that rarely work together. "
        "Nevertheless, most specialists agree that no single measure is sufficient, and that the coolest cities "
        "will be those that combine all three.",
    ],
    "groups": [
        {"type": "matching_headings", "range": (14, 18),
         "instruction": "Reading Passage 2 has five paragraphs, A-E. Choose the correct heading for each "
                        "paragraph from the list of headings below. Write the correct number, i-vii.",
         "options_title": "List of Headings",
         "options_style": "roman",
         "options": ["The limits of a technical solution", "An early record of city warmth",
                     "Why residents oppose new parks", "Slow but effective natural shade",
                     "Bringing hidden rivers back", "The cost of repainting roads",
                     "Lighter surfaces and an unexpected drawback"],
         "questions": [
             (14, "Paragraph A", "ii"), (15, "Paragraph B", "i"), (16, "Paragraph C", "iv"),
             (17, "Paragraph D", "vii"), (18, "Paragraph E", "v"),
         ]},
        {"type": "multiple_choice", "range": (19, 22),
         "instruction": "Choose the correct letter, A, B, C or D.",
         "questions": [
             (19, "According to the writer, city centres stay warm at night because",
              ["machines continue to run after dark.", "dark surfaces give back stored heat.",
               "farmland cools unusually fast.", "there is less wind in cities."], "B"),
             (20, "Which problem with air conditioning does the writer mention?",
              ["It is too expensive for homes.", "It does not work in offices.",
               "It adds heat to the streets outside.", "It is too noisy."], "C"),
             (21, "What is said about newly planted trees?",
              ["They cool streets immediately.", "They need very little water.",
               "Many of them die in their first dry summer.", "They grow faster in cities."], "C"),
             (22, "Lighter road surfaces",
              ["have been adopted in most cities.", "may make people on foot feel hotter.",
               "are cheaper than planting trees.", "reflect almost no light."], "B"),
         ]},
        {"type": "summary_completion", "range": (23, 26),
         "instruction": "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.",
         "title": "Cooling with water",
         "summary": "Features such as fountains and canals are 23 ______ with people who live nearby. Some "
                    "rivers once hidden under 24 ______ have been reopened, forming corridors for cooler air. "
                    "These schemes are costly and need 25 ______ between different departments. Experts "
                    "believe the best results come from using all 26 ______ approaches together.",
         "answers": {23: "popular", 24: "roads", 25: "cooperation", 26: "three"}},
    ],
}

PASSAGE_3 = {
    "title": "Is Handwriting Still Worth Teaching?",
    "paragraphs": [
        "In many classrooms the keyboard has replaced the pen. Pupils research, draft and submit their work on "
        "screens, and some education authorities have reduced the time set aside for handwriting practice or "
        "removed it from the timetable entirely. To its critics, handwriting is a slow and outdated skill, "
        "comparable to mental arithmetic in the age of the calculator. To its defenders, it is a tool for "
        "thinking that cannot easily be replaced.",
        "The strongest argument in its favour comes from research into memory. The psychologist Dr Elena Marsh "
        "asked two groups of university students to take notes during the same series of lectures, one group by "
        "hand and the other on laptops. A week later the students who had written by hand performed better on "
        "questions that required them to explain ideas, although the two groups were equally good at recalling "
        "simple facts. Marsh believes that because writing by hand is slower, students are forced to summarise "
        "rather than copy.",
        "Others doubt that such findings justify hours of practice in primary school. Priya Nair, who studies "
        "educational technology, argues that the advantage disappears when laptop users are taught to take "
        "notes selectively. In her view the benefit lies in the habit of summarising, not in the pen itself. "
        "The research, she says, has been widely misunderstood. She adds that children with certain physical "
        "difficulties find handwriting exhausting, and that for them a keyboard removes a barrier that has "
        "nothing to do with intelligence.",
        "Teachers tend to take a practical position. Tom Okafor, the head of a large primary school, points out "
        "that examinations in most subjects are still written by hand, and that pupils who write slowly or "
        "illegibly are at a disadvantage whatever they know. His school teaches both skills from the age of "
        "six. Handwriting lessons are short and frequent, lasting ten minutes each morning, while typing is "
        "introduced through ordinary project work instead of separate classes. Okafor reports that parents were "
        "initially sceptical but now strongly support the arrangement.",
        "It is unlikely that the debate will be settled by evidence alone, since it also involves questions of "
        "value. A handwritten letter carries a personal quality that many people are unwilling to lose, and a "
        "signature remains a legal requirement in numerous situations. At the same time, almost all paid work "
        "now involves a keyboard. The sensible conclusion may be that schools should stop treating the two "
        "skills as rivals. Children who can do both fluently are better prepared than those who have mastered "
        "only one.",
    ],
    "groups": [
        {"type": "yes_no_ng", "range": (27, 31),
         "instruction": "Do the following statements agree with the claims of the writer in Reading Passage 3? "
                        "Write YES if the statement agrees with the claims of the writer, NO if the statement "
                        "contradicts the claims of the writer, NOT GIVEN if it is impossible to say what the "
                        "writer thinks about this.",
         "questions": [
             (27, "Some education authorities no longer include handwriting in the timetable.", "YES"),
             (28, "Evidence alone will probably end the disagreement about handwriting.", "NO"),
             (29, "Many people value the personal quality of a handwritten letter.", "YES"),
             (30, "Employers prefer applicants who have good handwriting.", "NOT GIVEN"),
             (31, "Schools ought to treat handwriting and typing as competing skills.", "NO"),
         ]},
        {"type": "matching_features", "range": (32, 36),
         "instruction": "Look at the following statements and the list of people below. Match each statement "
                        "with the correct person, A, B or C. NB You may use any letter more than once.",
         "options_title": "List of People",
         "options": ["Dr Elena Marsh", "Tom Okafor", "Priya Nair"],
         "questions": [
             (32, "Writing more slowly encourages students to summarise.", "A"),
             (33, "Keyboards help children who have physical difficulties.", "C"),
             (34, "Poor handwriting can affect examination results.", "B"),
             (35, "Training laptop users can remove the advantage of handwriting.", "C"),
             (36, "Short daily lessons are an effective way to teach handwriting.", "B"),
         ]},
        {"type": "short_answer", "range": (37, 40),
         "instruction": "Answer the questions below. Choose NO MORE THAN TWO WORDS AND/OR A NUMBER from the "
                        "passage for each answer.",
         "questions": [
             (37, "How long after the lectures were the students tested?", "a week / one week"),
             (38, "At what age do pupils at Okafor's school begin learning both skills?", "six / 6"),
             (39, "How many minutes does each handwriting lesson last?", "ten / 10"),
             (40, "What remains a legal requirement in many situations?", "(a) signature"),
         ]},
    ],
}

READING = [PASSAGE_1, PASSAGE_2, PASSAGE_3]

WRITING_TASK1 = {
    "intro": "You should spend about 20 minutes on this task.",
    "prompt": "The table below shows the number of visitors (in thousands) to three types of attraction in "
              "one city in 2010 and 2020.",
    "table": [["Attraction", "2010", "2020"], ["Museums", "420", "610"],
              ["Parks", "380", "390"], ["Theatres", "250", "170"]],
    "task": "Summarise the information by selecting and reporting the main features, and make comparisons "
            "where relevant.",
    "min_words": 150,
}
WRITING_TASK2 = {
    "intro": "You should spend about 40 minutes on this task.",
    "prompt": "Some people believe that public libraries are no longer necessary because information is "
              "available online. Others think libraries still play an important role in a community.",
    "task": "Discuss both these views and give your own opinion.",
    "note": "Give reasons for your answer and include any relevant examples from your own knowledge or experience.",
    "min_words": 250,
}

SPEAKING = {
    "part1": ["Do you live in a house or a flat?", "What do you like most about the area where you live?",
              "How do you usually travel to work or school?", "Do you prefer mornings or evenings? Why?"],
    "part2": {
        "topic": "Describe a skill you learned outside school.",
        "points": ["what the skill is", "who taught you", "how long it took to learn"],
        "final": "and explain why this skill is useful to you.",
    },
    "part3": ["Why do some adults find it hard to learn new skills?",
              "Should schools teach practical skills as well as academic subjects?",
              "How has technology changed the way people learn?"],
}

AUDIOSCRIPTS = {
    1: "WOMAN: Riverside Community Garden, good morning. MAN: Hello, I'd like to ask about joining. WOMAN: Of "
       "course. Membership is twenty-five pounds a year, and we're open every day except Monday.",
    2: "GUIDE: Welcome to Holloway Science Museum. Before it became a museum, this building was a textile "
       "factory. This year we have opened a children's workshop on the ground floor.",
    3: "MAYA: So what went wrong with the first questionnaire? DANIEL: Well, some of the wording was unclear, "
       "and far too few people replied. MAYA: The tutor said we should add open questions.",
    4: "LECTURER: Today I want to look at an everyday object, the pencil. Roman writers used a thin rod made "
       "of lead, which is why we still speak of pencil lead today.",
}


def _accepted(answer: str) -> list:
    """Biến thể đáp án được chấp nhận: 'a / b' → [a, b]; '(a) signature' → [signature, a signature]."""
    accepted = []
    for variant in (v.strip() for v in answer.split("/")):
        optional = re.match(r"^\((\w+)\)\s+(.*)$", variant)
        if optional:
            accepted += [optional.group(2), f"{optional.group(1)} {optional.group(2)}"]
        else:
            accepted.append(variant)
    return accepted


def _letters(options: list, style: str = "alpha") -> list:
    roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]
    return [(roman[i] if style == "roman" else chr(ord("A") + i), text) for i, text in enumerate(options)]


def _render_group(pdf: Doc, group: dict, expected_questions: list, key: dict, where: dict):
    start, end = group["range"]
    label = f"Question {start}" if start == end else f"Questions {start}-{end}"
    pdf.heading(label, 11)
    pdf.para(group["instruction"], style="I", size=10, gap=2)
    if group.get("title"):
        pdf.line(group["title"], style="B")
        pdf.ln(1)

    def record(number: int, answer: str, **extra):
        expected_questions.append({"number": number, "type": group["type"], **where, **extra})
        key[str(number)] = {"raw": answer, "accept": _accepted(answer)}

    if group["type"] == "multiple_select":
        pdf.line(group["stem"])
        for letter, text in _letters(group["options"]):
            pdf.line(f"   {letter}   {text}")
        for number, answer in zip(range(start, end + 1), group["answers"]):
            record(number, answer, options=len(group["options"]))
            key[str(number)].update({"any_order_with": [n for n in range(start, end + 1) if n != number],
                                     "accept": list(group["answers"])})
    elif group["type"] == "summary_completion":
        pdf.para(group["summary"], gap=1)
        for number, answer in group["answers"].items():
            record(number, answer)
    else:
        if group.get("options"):
            if group.get("options_title"):
                pdf.line(group["options_title"], style="B", size=10)
            for letter, text in _letters(group["options"], group.get("options_style", "alpha")):
                pdf.line(f"   {letter}   {text}", size=10)
            pdf.ln(2)
        for question in group["questions"]:
            if len(question) == 4:  # trắc nghiệm có lựa chọn riêng
                number, stem, options, answer = question
                pdf.line(f"{number}   {stem}")
                for letter, text in _letters(options):
                    pdf.line(f"      {letter}   {text}")
                pdf.ln(1)
                record(number, answer, options=len(options))
            else:
                number, text, answer = question
                pdf.line(f"{number}   {text}")
                record(number, answer)
    pdf.ln(4)


def build_mini_ielts(path: str) -> dict:
    pdf = Doc("Studia Practice Tests")
    expected = {
        "tests": 1,
        "listening": {"questions": [], "answer_key": {}, "parts": 4, "start_page": None},
        "reading": {"questions": [], "answer_key": {}, "passages": [], "start_page": None},
        "writing": {"task1_min_words": 150, "task2_min_words": 250, "start_page": None},
        "speaking": {"parts": 3, "start_page": None},
        "answer_keys_page": None,
        "audioscripts_page": None,
    }

    # --- Listening ---
    for part in LISTENING:
        pdf.add_page()
        if part["part"] == 1:
            pdf.heading("Test 1", 20)
            pdf.heading("LISTENING", 16)
            expected["listening"]["start_page"] = pdf.page_no()
        pdf.heading(f"PART {part['part']}", 13)
        for group in part["groups"]:
            _render_group(pdf, group, expected["listening"]["questions"],
                          expected["listening"]["answer_key"], {"part": part["part"]})

    # --- Reading ---
    for index, passage in enumerate(READING, start=1):
        pdf.add_page()
        if index == 1:
            pdf.heading("READING", 16)
            expected["reading"]["start_page"] = pdf.page_no()
        first, last = passage["groups"][0]["range"][0], passage["groups"][-1]["range"][1]
        pdf.heading(f"READING PASSAGE {index}", 13)
        pdf.para(f"You should spend about 20 minutes on Questions {first}-{last}, which are based on "
                 f"Reading Passage {index} below.", style="I", size=10)
        pdf.heading(passage["title"], 14)
        for i, paragraph in enumerate(passage["paragraphs"]):
            prefix = f"{chr(ord('A') + i)}   " if passage.get("lettered") else ""
            pdf.para(prefix + paragraph, size=10)
        word_count = len(" ".join(passage["paragraphs"]).split())
        assert word_count >= 400, f"Passage {index} has only {word_count} words"
        expected["reading"]["passages"].append({
            "index": index, "title": passage["title"], "word_count": word_count,
            "paragraphs": len(passage["paragraphs"]), "first_words": passage["paragraphs"][0][:60],
            "questions": [first, last],
        })
        pdf.add_page()
        for group in passage["groups"]:
            _render_group(pdf, group, expected["reading"]["questions"],
                          expected["reading"]["answer_key"], {"passage": index})

    # --- Writing ---
    pdf.add_page()
    pdf.heading("WRITING", 16)
    expected["writing"]["start_page"] = pdf.page_no()
    pdf.heading("WRITING TASK 1", 13)
    pdf.para(WRITING_TASK1["intro"], style="I", size=10)
    pdf.para(WRITING_TASK1["prompt"], style="B")
    pdf.para(WRITING_TASK1["task"])
    pdf.para(f"Write at least {WRITING_TASK1['min_words']} words.")
    pdf.set_font("Helvetica", "", 10)
    with pdf.table(col_widths=(50, 30, 30), width=110, align="LEFT") as table:
        for row_cells in WRITING_TASK1["table"]:
            row = table.row()
            for cell_text in row_cells:
                row.cell(cell_text)
    pdf.add_page()
    pdf.heading("WRITING TASK 2", 13)
    pdf.para(WRITING_TASK2["intro"], style="I", size=10)
    pdf.para("Write about the following topic:")
    pdf.para(WRITING_TASK2["prompt"], style="B")
    pdf.para(WRITING_TASK2["task"], style="B")
    pdf.para(WRITING_TASK2["note"])
    pdf.para(f"Write at least {WRITING_TASK2['min_words']} words.")

    # --- Speaking ---
    pdf.add_page()
    pdf.heading("SPEAKING", 16)
    expected["speaking"]["start_page"] = pdf.page_no()
    pdf.heading("PART 1", 13)
    pdf.para("The examiner asks you about yourself, your home, work or studies and other familiar topics.",
             style="I", size=10)
    for question in SPEAKING["part1"]:
        pdf.line(f"- {question}")
    pdf.ln(4)
    pdf.heading("PART 2", 13)
    pdf.para(SPEAKING["part2"]["topic"], style="B")
    pdf.line("You should say:")
    for point in SPEAKING["part2"]["points"]:
        pdf.line(f"   - {point}")
    pdf.para(SPEAKING["part2"]["final"])
    pdf.para("You will have to talk about the topic for one to two minutes. You have one minute to think "
             "about what you are going to say.", style="I", size=10)
    pdf.heading("PART 3", 13)
    pdf.para("Discussion topics:", style="I", size=10)
    for question in SPEAKING["part3"]:
        pdf.line(f"- {question}")

    # --- Audioscripts ---
    pdf.add_page()
    pdf.heading("Audioscripts", 16)
    expected["audioscripts_page"] = pdf.page_no()
    pdf.heading("TEST 1", 13)
    for part_no, script in AUDIOSCRIPTS.items():
        pdf.heading(f"PART {part_no}", 11)
        pdf.para(script, size=10)

    # --- Answer keys ---
    pdf.add_page()
    pdf.heading("Listening and Reading answer keys", 16)
    expected["answer_keys_page"] = pdf.page_no()
    pdf.heading("TEST 1", 13)

    def render_key(title: str, sections: list, key: dict):
        pdf.heading(title, 12)
        for section_label, groups in sections:
            first, last = groups[0]["range"][0], groups[-1]["range"][1]
            pdf.line(f"{section_label}, Questions {first}-{last}", style="B", size=10)
            for group in groups:
                start, end = group["range"]
                if group.get("any_order"):
                    pdf.line(f"{start}&{end}   IN EITHER ORDER   {'   '.join(group['answers'])}", size=10)
                    continue
                for number in range(start, end + 1):
                    pdf.line(f"{number}   {key[str(number)]['raw']}", size=10)
            pdf.ln(2)

    render_key("LISTENING", [(f"Part {p['part']}", p["groups"]) for p in LISTENING],
               expected["listening"]["answer_key"])
    pdf.add_page()
    render_key("READING", [(f"Reading Passage {i}", p["groups"]) for i, p in enumerate(READING, start=1)],
               expected["reading"]["answer_key"])

    for skill in ("listening", "reading"):
        numbers = [q["number"] for q in expected[skill]["questions"]]
        assert numbers == list(range(1, 41)), f"{skill} questions must be numbered 1..40, got {numbers}"
        assert len(expected[skill]["answer_key"]) == 40

    expected["page_count"] = pdf.page_no()
    pdf.output(path)
    return _write_expected(path, expected)


def build_all(out_dir: str) -> dict:
    os.makedirs(out_dir, exist_ok=True)
    return {
        "text_book": build_text_book(os.path.join(out_dir, "text_book.pdf")),
        "scanned": build_scanned(os.path.join(out_dir, "scanned.pdf")),
        "mini_ielts": build_mini_ielts(os.path.join(out_dir, "mini_ielts.pdf")),
    }


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
    for name, info in build_all(target).items():
        print(f"{name}.pdf: {info['page_count']} pages")
