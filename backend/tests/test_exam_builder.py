import json
import os
import re
import unittest

from app.services.doc_ingest import extract_blocks
from app.services.exam_builder import build_exam_drafts
from app.services.exam_builder.answer_key import (
    build_answer_entries, expand_variants, is_correct, normalize_answer, parse_numbered_answers, score_answers,
)
from app.services.exam_builder.extractor import (
    detect_type, detect_word_limit, group_needs_help, parse_group, parse_options, refine_group, split_numbered,
)
from app.services.exam_builder.schema import iter_groups, strip_answers, to_exam_room_payload
from app.services.exam_builder.segmenter import scrub, segment_blocks, split_question_groups
from app.services.exam_builder.validator import validate_exam
from test_uploads import LocalStoreTestCase


def block(text, block_type="paragraph", page=1, bid=None):
    return {"id": bid or f"b{abs(hash(text)) % 10**6}", "text": text, "block_type": block_type,
            "level": 3 if block_type == "heading" else None, "page_number": page}


class AnswerKeyTests(unittest.TestCase):
    def test_variants_and_optional_words(self):
        self.assertEqual(expand_variants("(the) river"), ["river", "the river"])
        self.assertEqual(expand_variants("(a) signature"), ["signature", "a signature"])
        self.assertEqual(expand_variants("ratio / proportion"), ["ratio", "proportion"])
        self.assertEqual(expand_variants("metal(s)"), ["metal", "metals"])
        self.assertEqual(expand_variants("behaviour/ behavior"), ["behaviour", "behavior"])

    def test_normalisation_table(self):
        cases = [("  Engine ", "engine", True), ("ENGINE.", "engine", True), ("the engine", "engine", False),
                 ("1,000", "1000", True), ("1 000", "1000", False), ("A", "a", True), ("b", "A", False),
                 ("Mount  Everest", "mount everest", True), ('"yes"', "yes", True), ("", "x", False),
                 ("twenty", "20", False), ("It's", "it’s", True), ("colour", "color", False),
                 ("NOT GIVEN", "not given", True), ("not  given", "NOT GIVEN", True), ("ii", "II", True),
                 ("iii", "ii", False), ("£120", "120", False), ("12", "12 ", True), ("(cafe)", "cafe", True)]
        for given, accepted, expected in cases:
            self.assertEqual(is_correct(given, {"accept": [accepted]}), expected, (given, accepted))
        self.assertEqual(normalize_answer(None), "")

    def test_parse_simple_sequence_and_junk_truncation(self):
        text = ("1 10/ten 2 weather 3 safety 9 videos 10 Lockers Part 2, Questions 11-20 "
                "11 A 12 B If you score ... 0-19 you are unlikely to get an acceptable score 13 C 20-28")
        raw = parse_numbered_answers(text, [1, 2, 3, 9, 10, 11, 12, 13])
        entries = build_answer_entries(raw)
        self.assertEqual(entries["1"]["accept"], ["10", "ten"])
        self.assertEqual(entries["10"]["accept"], ["Lockers"])
        self.assertEqual(entries["12"]["accept"], ["B"])
        self.assertEqual(entries["13"]["accept"], ["C"])

    def test_answer_equal_to_next_number_is_not_mistaken_for_marker(self):
        raw = parse_numbered_answers("1 2 2 Monday 3 locker", [1, 2, 3])
        self.assertEqual(raw[1], "2")
        self.assertEqual(raw[2], "Monday")

    def test_either_order_pairs_adjacent_loose_and_separate(self):
        adjacent = build_answer_entries(parse_numbered_answers("21&22 IN EITHER ORDER B D 23 A", [21, 22, 23]))
        self.assertEqual(adjacent["21"]["accept"], ["B", "D"])
        self.assertEqual(adjacent["22"]["any_order_with"], [21])
        self.assertEqual(adjacent["23"]["accept"], ["A"])

        loose = ("1 (the) 13(th) January 2 48 21 &22 IN EITHER ORDER 3 pizza 4 India 5 mirror B E "
                 "23&24 IN EITHER ORDER C 6 April 7 natural D 25 G")
        entries = build_answer_entries(parse_numbered_answers(loose, list(range(1, 8)) + [21, 22, 23, 24, 25]))
        self.assertEqual((entries["21"]["accept"], entries["22"]["accept"]), (["B", "E"], ["B", "E"]))
        self.assertEqual(entries["23"]["accept"], ["C", "D"])      # hai cặp liền nhau không bị gộp
        self.assertEqual(entries["21"]["any_order_with"], [22])
        self.assertEqual(entries["25"]["accept"], ["G"])
        self.assertEqual(entries["5"]["accept"], ["mirror"])

    def test_letter_i_is_an_answer_not_a_slash_between_numbers(self):
        raw = parse_numbered_answers("3 250 I two hundred and fifty 32 E 33 I 34 A", [3, 32, 33, 34])
        self.assertEqual(raw[33], "I")
        self.assertEqual(raw[3], "250 / two hundred and fifty")

    def test_not_given_without_space_is_repaired(self):
        raw = parse_numbered_answers("9 NOTGIVEN 10 FALSE", [9, 10])
        self.assertEqual(build_answer_entries(raw)["9"]["accept"], ["NOT GIVEN"])

    def test_score_pair_letters_count_once(self):
        key = build_answer_entries({21: "B [either:21-22]", 22: "D [either:21-22]"})
        both = score_answers(key, {"21": "D", "22": "B"})
        self.assertTrue(both[21]["correct"] and both[22]["correct"])
        duplicated = score_answers(key, {"21": "B", "22": "B"})
        self.assertEqual([duplicated[21]["correct"], duplicated[22]["correct"]], [True, False])
        self.assertEqual(score_answers(key, {"21": "A"})[21]["correct_answers"], ["B", "D"])


class SegmenterNoiseTests(unittest.TestCase):
    def test_scrub_strips_running_header_and_footer_debris(self):
        self.assertEqual(scrub("11 Test 1 Questions 17-20 What ability is required?"),
                         "Questions 17-20 What ability is required?")
        self.assertEqual(scrub("Listening 33 Test 2 Questions 15-20 Label the map"), "Questions 15-20 Label the map")
        self.assertEqual(scrub("30 Podcast on floating marine cities 14 p. 99 Listening"),
                         "30 Podcast on floating marine cities")
        self.assertEqual(scrub("A being well-organised B being flexible 12 Test 1"), "A being well-organised B being flexible")
        self.assertEqual(scrub("Contact number: 0161 5550142"), "Contact number: 0161 5550142")

    def test_markers_inside_text_and_prepositional_references(self):
        blocks = [
            block("Test 1 LISTENING PART 1 Questions 1-4"),
            block("Complete the notes below. Write ONE WORD ONLY for each answer."),
            block("1 Name: ______ 2 Age: ______ 3 City: ______ 4 Job: ______ 12 Test 1 Listening"),
            block("1 o I a p. 1111 I t@ p. 97 Listening PART 2 Questions 5-8 Questions 5-8 Choose the correct letter, A, B or C."),
            block("5 What is it? A big B small C tiny 6 Where? A here B there C nowhere"),
            block("7 Why? A a B b C c 8 How? A x B y C z Write your answers next to Questions 5-8."),
        ]
        tests = segment_blocks(blocks)
        self.assertEqual(sorted(tests), [1])
        seg = tests[1]
        self.assertEqual(sorted(seg.listening), [1, 2])
        pre, groups = split_question_groups(seg.listening[1])
        self.assertEqual([(g.start, g.end) for g in groups], [(1, 4)])
        group = parse_group(1, 4, groups[0].blocks)
        self.assertEqual([q["question"] for q in group["questions"]],
                         ["Name: ___", "Age: ___", "City: ___", "Job: ___"])
        _pre, groups2 = split_question_groups(seg.listening[2])
        self.assertEqual([(g.start, g.end) for g in groups2], [(5, 8)])  # "next to Questions 5-8" không tạo nhóm mới

    def test_running_test_header_does_not_reset_part(self):
        blocks = [block("Test 1 LISTENING PART 1"), block("1 first ______ 2 second ______"),
                  block("Test 1"), block("3 third ______"), block("PART 2"), block("Test 1"), block("11 eleventh ______")]
        seg = segment_blocks(blocks)[1]
        self.assertEqual(sorted(seg.listening), [1, 2])
        self.assertTrue(any("third" in b["text"] for b in seg.listening[1]))
        self.assertTrue(any("eleventh" in b["text"] for b in seg.listening[2]))

    def test_text_before_first_test_is_ignored(self):
        blocks = [block("Introduction READING PART 1 how to use this book"), block("Test 2"), block("LISTENING"),
                  block("PART 1"), block("1 ______")]
        tests = segment_blocks(blocks)
        self.assertEqual(sorted(tests), [2])
        self.assertEqual(len(tests[2].listening[1]), 1)


class GroupParsingTests(unittest.TestCase):
    def group(self, instruction, body_lines, start, end):
        blocks = [block(instruction)] + [block(t) for t in body_lines]
        return parse_group(start, end, blocks)

    def test_type_and_word_limit_detection(self):
        self.assertEqual(detect_type("Complete the notes below.", ""), "note_completion")
        self.assertEqual(detect_type("Choose TWO letters, A-E.", ""), "multiple_select")
        self.assertEqual(detect_type("Choose FOUR answers from the box and write the correct letter, A-F, "
                                     "next to Questions 27-30.", ""), "matching_features")
        self.assertEqual(detect_type("Label the map below. Write the correct letter, A-I, next to Questions 15-20.", ""),
                         "map_labelling")
        self.assertEqual(detect_type("Do the following statements agree with the information given? Write TRUE "
                                     "if it agrees, FALSE if it contradicts, NOT GIVEN if there is no information",
                                     ""), "true_false_ng")
        self.assertEqual(detect_type("Do the following statements agree with the claims of the writer? Write YES if",
                                     "NO if the statement contradicts NOT GIVEN if it is impossible"), "yes_no_ng")
        self.assertEqual(detect_type("Reading Passage 2 has seven paragraphs, A-G.", ""), "matching_information")
        self.assertEqual(detect_word_limit("Write NO MORE THAN TWO WORDS AND/OR A NUMBER"), (2, True))
        self.assertEqual(detect_word_limit("Write ONE WORD ONLY for each answer."), (1, False))
        self.assertEqual(detect_word_limit("Write ONE WORD AND/OR A NUMBER"), (1, True))

    def test_embedded_blanks_split_into_one_question_per_gap(self):
        g = self.group("Complete the notes below. Write ONE WORD ONLY.", [
            "General information",
            "• Bring suitable clothing, a 7 ......................... and toiletries (e.g. shampoo) .",
            "• There is a 8 ......................... at the club .",
            "• 9 ......................... and 10 ......................... are available.",
        ], 7, 10)
        self.assertEqual(g["context_title"], "General information")
        self.assertEqual(g["layout"], "embedded")
        self.assertEqual([q["question"] for q in g["questions"]], [
            "Bring suitable clothing, a 7 ___ and toiletries (e.g. shampoo).",
            "There is a 8 ___ at the club.",
            "9 ___",
            "and 10 ___ are available.",
        ])

    def test_blank_runs_all_become_three_underscores(self):
        g = self.group("Complete the sentences below.", ["1 The ·····--········ of the day 2 It is …… hot"], 1, 2)
        self.assertEqual([q["question"] for q in g["questions"]], ["The ___ of the day", "It is ___ hot"])

    def test_single_question_group_uses_whole_body(self):
        g = self.group("Choose the correct letter, A, B, C or D.", [
            "Which is the best title for the passage?",
            "A How to cook B Why we eat C When to sleep D Where to go"], 40, 40)
        self.assertEqual(g["questions"][0]["question"], "Which is the best title for the passage?")
        self.assertEqual([o["key"] for o in g["questions"][0]["options"]], ["A", "B", "C", "D"])

    def test_option_list_in_columns_read_row_by_row(self):
        text = "A reliability D prejudices G framework B funding E computers H confidentiality C skills F equality I approval"
        _stem, options = parse_options(text, expected=9)
        self.assertEqual([o["key"] for o in options], list("ABCDEFGHI"))
        self.assertEqual(options[0]["text"], "reliability")
        self.assertEqual(options[1]["text"], "funding")
        self.assertEqual(options[8]["text"], "approval")

    def test_article_a_in_stem_is_not_taken_as_first_option(self):
        stem, options = parse_options("What is a good idea? A Always carry B Only buy C Ask others")
        self.assertEqual(stem, "What is a good idea?")
        self.assertEqual(len(options), 3)

    def test_split_numbered_ignores_numbers_inside_text(self):
        parts = split_numbered("1 It costs 120 pounds 2 Call 0161 5550142 3 Stop", [1, 2, 3])
        self.assertEqual(parts, {1: "It costs 120 pounds", 2: "Call 0161 5550142", 3: "Stop"})

    def test_matching_features_options_after_statements(self):
        g = self.group("What ability is required for each duty? Write the correct letter, A, B, or C, "
                       "next to Questions 17-20.",
                       ["Duties", "17 Prepping an actor 18 Continuity 19 General 20 Applying makeup "
                        "A being well-organised B being flexible C working quickly"], 17, 20)
        self.assertEqual(g["type"], "matching_features")
        self.assertEqual([q["question"] for q in g["questions"]],
                         ["Prepping an actor", "Continuity", "General", "Applying makeup"])
        self.assertEqual([o["key"] for o in g["shared_options"]], ["A", "B", "C"])


class LlmRefineTests(unittest.TestCase):
    class FakeLLM:
        def __init__(self, result=None, error=None):
            self.result, self.error, self.calls = result, error, 0

        def generate_json(self, prompt):
            self.calls += 1
            if self.error:
                raise self.error
            return self.result

    def weak_group(self):
        return parse_group(1, 2, [block("Choose the correct letter, A, B or C."),
                                  block("1 Where did the meeting happen? A Paris B London C Rome 2 Who came?")])

    BODY = "1 Where did the meeting happen? A Paris B London C Rome 2 Who came? A Tom B Ann C Bob"

    def good_answer(self):
        return {"type": "multiple_choice", "context_title": None, "shared_options": None, "questions": [
            {"number": 1, "question": "Where did the meeting happen?",
             "options": [{"key": "A", "text": "Paris"}, {"key": "B", "text": "London"}, {"key": "C", "text": "Rome"}]},
            {"number": 2, "question": "Who came?",
             "options": [{"key": "A", "text": "Tom"}, {"key": "B", "text": "Ann"}, {"key": "C", "text": "Bob"}]},
        ]}

    def test_valid_answer_replaces_weak_heuristic_group(self):
        group = self.weak_group()
        self.assertTrue(group_needs_help(group))
        refined = refine_group(self.FakeLLM(self.good_answer()), group, self.BODY)
        self.assertEqual(refined["source"], "ai")
        self.assertEqual([len(q["options"]) for q in refined["questions"]], [3, 3])
        self.assertFalse(group_needs_help(refined))

    def test_invented_text_is_rejected(self):
        bad = self.good_answer()
        bad["questions"][0]["question"] = "Which spacecraft landed on the far side of the moon last year?"
        group = self.weak_group()
        self.assertIs(refine_group(self.FakeLLM(bad), group, self.BODY), group)

    def test_wrong_numbers_or_failures_keep_heuristic(self):
        group = self.weak_group()
        wrong = self.good_answer()
        wrong["questions"][1]["number"] = 5
        self.assertIs(refine_group(self.FakeLLM(wrong), group, self.BODY), group)
        self.assertIs(refine_group(self.FakeLLM(None), group, self.BODY), group)
        self.assertIs(refine_group(self.FakeLLM(error=RuntimeError("quota")), group, self.BODY), group)


class ValidatorTests(unittest.TestCase):
    def content(self, questions, gtype="multiple_choice", options=True):
        opts = [{"key": "A", "text": "x"}, {"key": "B", "text": "y"}] if options else None
        return {"schema_version": 1, "sections": {"listening": {"audio_url": None, "parts": [{"part": 1, "groups": [{
            "type": gtype, "instruction": "i", "range": [questions[0], questions[-1]], "word_limit": 1,
            "questions": [{"number": n, "question": f"Q{n}", "options": opts} for n in questions]}]}]}}}

    def test_clean_exam_has_no_errors(self):
        content = self.content([1, 2])
        key = {"listening": {"1": {"accept": ["A"]}, "2": {"accept": ["B"]}}}
        result = validate_exam(content, key, has_audio=True)
        self.assertTrue(result["ok"])
        self.assertEqual([w["code"] for w in result["warnings"]], ["QUESTION_COUNT"])

    def test_detects_gaps_duplicates_missing_and_bad_keys(self):
        content = self.content([1, 3, 3])
        key = {"listening": {"1": {"accept": ["Z"]}, "9": {"accept": ["A"]}}}
        codes = {(e["code"], e.get("question")) for e in validate_exam(content, key)["errors"]}
        self.assertIn(("MISSING_NUMBER", 2), codes)
        self.assertIn(("DUPLICATE_NUMBER", 3), codes)
        self.assertIn(("MISSING_KEY", 3), codes)
        self.assertIn(("KEY_NOT_IN_OPTIONS", 1), codes)
        orphan = [w for w in validate_exam(content, key)["warnings"] if w["code"] == "ORPHAN_KEY"]
        self.assertEqual([w["question"] for w in orphan], [9])

    def test_mcq_without_options_and_empty_passage(self):
        content = self.content([1], options=False)
        content["sections"]["reading"] = {"passages": [{"index": 1, "title": "t", "body_markdown": "", "groups": []}]}
        codes = [e["code"] for e in validate_exam(content, {"listening": {"1": {"accept": ["A"]}}})["errors"]]
        self.assertIn("MCQ_OPTIONS", codes)
        self.assertIn("PASSAGE_EMPTY", codes)


class MiniIeltsEndToEndTests(LocalStoreTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.blocks = extract_blocks(open(os.path.join(cls.fixtures_dir.name, "mini_ielts.pdf"), "rb").read(), "pdf").blocks
        cls.draft = build_exam_drafts(cls.blocks)[0]
        cls.expected = cls.expected["mini_ielts"]

    def test_one_clean_draft_with_expected_counts(self):
        self.assertEqual(len(build_exam_drafts(self.blocks)), 1)
        validation = self.draft.validation
        self.assertTrue(validation["ok"], validation["errors"])
        self.assertEqual([w["code"] for w in validation["warnings"]], ["LISTENING_AUDIO_MISSING"])
        self.assertEqual(validation["stats"], {"listening": 40, "reading": 40, "passages": 3,
                                               "writing_tasks": 2, "speaking_parts": 3})

    def test_question_types_match_the_source(self):
        for skill in ("listening", "reading"):
            types = {q["number"]: g["type"] for _l, g in iter_groups(self.draft.content, skill)
                     for q in g["questions"]}
            for q in self.expected[skill]["questions"]:
                self.assertEqual(types[q["number"]], q["type"], f"{skill} Q{q['number']}")

    def test_every_answer_matches_the_key_in_the_book(self):
        for skill in ("listening", "reading"):
            for number, entry in self.expected[skill]["answer_key"].items():
                got = self.draft.answer_key[skill][number]
                self.assertEqual(got["accept"], entry["accept"], f"{skill} Q{number}")
                self.assertEqual(got.get("any_order_with"), entry.get("any_order_with"), f"{skill} Q{number}")

    def test_passages_are_copied_verbatim_from_blocks(self):
        passages = self.draft.content["sections"]["reading"]["passages"]
        for passage, expected in zip(passages, self.expected["reading"]["passages"]):
            self.assertEqual(passage["title"], expected["title"])
            body = re.sub(r"^[A-G]\s+", "", passage["body_markdown"])  # đoạn đánh chữ A–E có nhãn đầu đoạn
            self.assertTrue(body.startswith(expected["first_words"]), body[:80])
            self.assertGreaterEqual(len(passage["body_markdown"].split()), expected["word_count"] - 5)

    def test_writing_speaking_and_materials(self):
        sections = self.draft.content["sections"]
        self.assertEqual((sections["writing"]["task1"]["min_words"], sections["writing"]["task2"]["min_words"]), (150, 250))
        self.assertIn("table below", sections["writing"]["task1"]["prompt"])
        self.assertEqual(len(sections["speaking"]["part1"]["questions"]), 4)
        self.assertIn("Describe a skill you learned outside school.", sections["speaking"]["part2"]["cue_card"])
        self.assertEqual(len(sections["speaking"]["part3"]["questions"]), 3)
        materials = self.draft.content["materials"]
        self.assertEqual([m["part"] for m in materials["audioscripts"]], [1, 2, 3, 4])
        self.assertIn("Riverside Community Garden", materials["audioscripts"][0]["text"])

    def test_room_payload_never_contains_answers_or_materials(self):
        payload = to_exam_room_payload(strip_answers(self.draft.content))
        text = json.dumps(payload)
        for secret in ("accept", "correct_answer", "audioscripts", "WOMAN:", "Hallam"):
            self.assertNotIn(secret, text)
        item = next(i for i in payload["reading"] if i["number"] == 14)
        self.assertEqual(item["type"], "multiple_choice")
        self.assertEqual(item["original_type"], "matching_headings")
        self.assertEqual(item["option_keys"], ["i", "ii", "iii", "iv", "v", "vi", "vii"])
        tfng = next(i for i in payload["reading"] if i["number"] == 1)
        self.assertEqual((tfng["type"], tfng["options"]), ("true_false_ng", ["TRUE", "FALSE", "NOT GIVEN"]))
        self.assertEqual(len(payload["reading_passages"]), 3)


if __name__ == "__main__":
    unittest.main()
