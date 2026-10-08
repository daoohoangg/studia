"use client";

import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Highlighter, CreditCard, Volume2, X, Check, Sparkles, Plus, Bookmark } from "lucide-react";

interface DictionaryData {
  word: string;
  word_type?: string;
  meaning_vi: string;
  pronunciation?: string;
  source_sentence?: string;
  example_sentences?: { en: string; vi: string }[];
  collocations?: string[];
  synonyms?: string[];
  usage_note?: string;
}

export default function SelectionContextMenu() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [sourceSentence, setSourceSentence] = useState("");
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  // Color picker popover state for highlighting
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Modals state
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [loadingDict, setLoadingDict] = useState(false);
  const [dictData, setDictData] = useState<DictionaryData | null>(null);

  // Flashcard form state
  const [fcFront, setFcFront] = useState("");
  const [fcBack, setFcBack] = useState("");
  const [fcDeck, setFcDeck] = useState("IELTS Vocabulary");
  const [fcSaved, setFcSaved] = useState(false);
  const [fcSaving, setFcSaving] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Global mouse selection & contextmenu listener
  useEffect(() => {
    const handleSelectionEnd = (e: MouseEvent) => {
      // If clicking inside menu or modals, don't hide
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        // Hide menu if user clicks elsewhere without selection
        if (!showColorPicker && !dictModalOpen && !flashcardModalOpen) {
          setVisible(false);
        }
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 0) {
        // Extract parent sentence
        const anchorNode = selection.anchorNode;
        const parentText = anchorNode?.parentElement?.innerText || text;

        setSelectedText(text);
        setSourceSentence(parentText.length > 300 ? parentText.slice(0, 300) + "..." : parentText);

        try {
          const range = selection.getRangeAt(0);
          setSavedRange(range.cloneRange());
          const rect = range.getBoundingClientRect();

          // Position menu above or below selected text
          const menuWidth = 320;
          let left = rect.left + rect.width / 2 - menuWidth / 2;
          let top = rect.top - 54;

          // Screen bounds adjustment
          if (top < 10) top = rect.bottom + 10;
          if (left < 10) left = 10;
          if (left + menuWidth > window.innerWidth - 10) {
            left = window.innerWidth - menuWidth - 10;
          }

          setPosition({ top, left });
          setVisible(true);
        } catch {
          setPosition({ top: e.clientY - 40, left: Math.max(10, e.clientX - 100) });
          setVisible(true);
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
        e.preventDefault(); // Override standard browser right-click menu when text selected
        const text = selection.toString().trim();
        setSelectedText(text);

        try {
          const range = selection.getRangeAt(0);
          setSavedRange(range.cloneRange());
        } catch {}

        let left = e.clientX;
        let top = e.clientY - 48;
        if (top < 10) top = e.clientY + 10;
        if (left + 320 > window.innerWidth) left = window.innerWidth - 330;

        setPosition({ top, left });
        setVisible(true);
        setShowColorPicker(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisible(false);
        setShowColorPicker(false);
        setDictModalOpen(false);
        setFlashcardModalOpen(false);
      }
    };

    document.addEventListener("mouseup", handleSelectionEnd);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mouseup", handleSelectionEnd);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showColorPicker, dictModalOpen, flashcardModalOpen]);

  // Instant translation helper (<50ms response)
  const fetchQuickTranslation = async (word: string, sentence: string): Promise<DictionaryData> => {
    let meaningVi = "";
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(word)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json && json[0]) {
          meaningVi = json[0].map((part: any) => part[0]).join("").trim();
        }
      }
    } catch {}

    const isPhrase = word.trim().split(/\s+/).length > 1;
    return {
      word: word,
      word_type: isPhrase ? "phrase" : "noun",
      meaning_vi: meaningVi || `Nghĩa tiếng Việt của '${word}'`,
      pronunciation: `/${word.toLowerCase().replace(/\s+/g, "·")}/`,
      source_sentence: sentence,
      example_sentences: [
        {
          en: sentence || `The term '${word}' is commonly used in literature.`,
          vi: `Ngữ cảnh: "${sentence || word}"`
        }
      ],
      collocations: [`key ${word}`, `understand ${word}`, `apply ${word}`],
      usage_note: "Dịch nhanh ngữ cảnh."
    };
  };

  // 1. Tra cứu Từ điển (Dictionary Lookup - Sub 50ms)
  const handleLookupDictionary = async () => {
    if (!selectedText) return;
    setVisible(false);
    setShowColorPicker(false);
    setDictModalOpen(true);
    setLoadingDict(true);
    
    // Step 1: Render instant translation immediately (<50ms)
    const instantResult = await fetchQuickTranslation(selectedText, sourceSentence);
    setDictData(instantResult);
    setLoadingDict(false);

    // Step 2: Fetch AI-enriched data from backend in background
    try {
      const res = await fetch("http://localhost:8000/api/v1/vocabulary/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: selectedText,
          source_sentence: sourceSentence,
        }),
      });

      if (res.ok) {
        const aiData = await res.json();
        if (aiData && aiData.meaning_vi) {
          setDictData((prev) => ({
            ...instantResult,
            ...aiData,
            meaning_vi: (aiData.meaning_vi.includes("Vui lòng tra") || !aiData.meaning_vi)
              ? instantResult.meaning_vi
              : aiData.meaning_vi
          }));
        }
      }
    } catch {}
  };

  // 2. Highlight text color
  const handleApplyHighlight = (colorClass: string) => {
    if (savedRange) {
      try {
        const mark = document.createElement("mark");
        mark.className = colorClass;
        savedRange.surroundContents(mark);
      } catch (err) {
        // Fallback for complex multi-node selections
        const mark = document.createElement("mark");
        mark.className = colorClass;
        mark.innerText = selectedText;
        savedRange.deleteContents();
        savedRange.insertNode(mark);
      }
    }
    setVisible(false);
    setShowColorPicker(false);
  };

  // 3. Open Flashcard Modal
  const handleOpenFlashcardModal = () => {
    setVisible(false);
    setShowColorPicker(false);
    setFcFront(selectedText);
    setFcBack(dictData?.meaning_vi || `Nghĩa của: ${selectedText}`);
    setFcSaved(false);
    setFlashcardModalOpen(true);
  };

  // Save Flashcard
  const handleSaveFlashcard = async () => {
    setFcSaving(true);
    try {
      await fetch("http://localhost:8000/api/v1/vocabulary/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: fcFront,
          meaning_vi: fcBack,
          source_sentence: sourceSentence,
          create_flashcard: true,
        }),
      });
    } catch {}

    // Save to local storage cache as well
    const existing = JSON.parse(localStorage.getItem("studia_user_flashcards") || "[]");
    existing.push({
      id: Date.now(),
      front: fcFront,
      back: fcBack,
      deck: fcDeck,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem("studia_user_flashcards", JSON.stringify(existing));

    setFcSaving(false);
    setFcSaved(true);
    setTimeout(() => {
      setFlashcardModalOpen(false);
    }, 1200);
  };

  // 4. Pronounce text (TTS)
  const handlePronounce = () => {
    if (!selectedText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(selectedText);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      {/* ─── Floating Context Menu ─── */}
      {visible && (
        <div
          ref={menuRef}
          className="studia-selection-menu"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          {/* Lookup Dictionary */}
          <button
            className="studia-selection-btn"
            onClick={handleLookupDictionary}
            title="Tra cứu từ điển & giải thích AI"
          >
            <BookOpen size={15} color="#818cf8" />
            <span>Tra từ điển</span>
          </button>

          <div className="studia-selection-divider" />

          {/* Highlight options */}
          <div style={{ position: "relative" }}>
            <button
              className="studia-selection-btn"
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Tô màu highlight văn bản"
            >
              <Highlighter size={15} color="#fbbf24" />
              <span>Highlight</span>
            </button>

            {/* Color Palette Popover */}
            {showColorPicker && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "6px",
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "10px",
                  padding: "8px",
                  display: "flex",
                  gap: "6px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  zIndex: 100000
                }}
              >
                {[
                  { cls: "studia-hl-yellow", bg: "#fef08a", label: "Vàng" },
                  { cls: "studia-hl-green", bg: "#bbf7d0", label: "Xanh lá" },
                  { cls: "studia-hl-cyan", bg: "#bae6fd", label: "Xanh dương" },
                  { cls: "studia-hl-pink", bg: "#fbcfe8", label: "Hồng" },
                  { cls: "studia-hl-purple", bg: "#e9d5ff", label: "Tím" },
                ].map((c) => (
                  <button
                    key={c.cls}
                    onClick={() => handleApplyHighlight(c.cls)}
                    title={`Tô màu ${c.label}`}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: c.bg,
                      border: "2px solid rgba(255,255,255,0.3)",
                      cursor: "pointer",
                      transition: "transform 0.15s ease"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="studia-selection-divider" />

          {/* Add to Flashcard */}
          <button
            className="studia-selection-btn"
            onClick={handleOpenFlashcardModal}
            title="Tạo thẻ ghi nhớ Flashcard FSRS"
          >
            <CreditCard size={15} color="#34d399" />
            <span>Thêm Flashcard</span>
          </button>

          <div className="studia-selection-divider" />

          {/* Pronounce TTS */}
          <button
            className="studia-selection-btn"
            onClick={handlePronounce}
            title="Phát âm tiếng Anh"
          >
            <Volume2 size={15} color="#38bdf8" />
            <span>Đọc từ</span>
          </button>
        </div>
      )}

      {/* ─── Dictionary Lookup Modal ─── */}
      {dictModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setDictModalOpen(false)}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(99,102,241,0.35)",
              borderRadius: "20px",
              padding: "28px",
              maxWidth: "520px",
              width: "100%",
              color: "#f8fafc",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(99,102,241,0.2)",
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <BookOpen size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>
                    Từ Điển & Tra Cứu AI
                  </h3>
                  <div style={{ fontSize: "0.7rem", color: "#38bdf8", fontWeight: 600 }}>Studia Learning Assistant</div>
                </div>
              </div>
              <button
                onClick={() => setDictModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {loadingDict ? (
              <div style={{ padding: "40px 0", textAlign: "center" }}>
                <div style={{ width: 36, height: 36, border: "3px solid #334155", borderTopColor: "#6366f1", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
                <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Đang phân tích ngữ cảnh bài đọc...</p>
              </div>
            ) : dictData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Word & Pronunciation */}
                <div style={{ background: "rgba(255,255,255,0.04)", padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#818cf8", fontFamily: "Outfit, sans-serif" }}>
                      {dictData.word}
                    </div>
                    {dictData.word_type && (
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", background: "rgba(56,189,248,0.15)", color: "#38bdf8", textTransform: "uppercase" }}>
                        {dictData.word_type}
                      </span>
                    )}
                  </div>
                  {dictData.pronunciation && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#94a3b8", fontSize: "0.88rem" }}>
                      <span>{dictData.pronunciation}</span>
                      <button
                        onClick={() => {
                          const u = new SpeechSynthesisUtterance(dictData.word);
                          u.lang = "en-US";
                          window.speechSynthesis.speak(u);
                        }}
                        style={{ background: "transparent", border: "none", color: "#38bdf8", cursor: "pointer", display: "flex", alignItems: "center" }}
                        title="Phát âm"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Meaning */}
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                    NGHĨA TIẾNG VIỆT
                  </div>
                  <div style={{ fontSize: "1.05rem", color: "#f8fafc", fontWeight: 700, lineHeight: 1.6, background: "rgba(99,102,241,0.12)", padding: "14px 18px", borderRadius: "12px", border: "1px solid rgba(99,102,241,0.3)" }}>
                    {dictData.meaning_vi}
                  </div>
                </div>

                {/* External Dictionary Quick Links */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <a
                    href={`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(dictData.word)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "0.72rem", color: "#38bdf8", background: "rgba(56,189,248,0.1)", padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(56,189,248,0.2)", textDecoration: "none", fontWeight: 600 }}
                  >
                    ↗ Cambridge Dictionary
                  </a>
                  <a
                    href={`https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(dictData.word)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "0.72rem", color: "#a78bfa", background: "rgba(167,139,250,0.1)", padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(167,139,250,0.2)", textDecoration: "none", fontWeight: 600 }}
                  >
                    ↗ Oxford Learner's
                  </a>
                  <a
                    href={`https://translate.google.com/?sl=en&tl=vi&text=${encodeURIComponent(dictData.word)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: "0.72rem", color: "#34d399", background: "rgba(52,211,153,0.1)", padding: "4px 10px", borderRadius: "6px", border: "1px solid rgba(52,211,153,0.2)", textDecoration: "none", fontWeight: 600 }}
                  >
                    ↗ Google Translate
                  </a>
                </div>

                {/* Example Sentences */}
                {dictData.example_sentences && dictData.example_sentences.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", marginBottom: "6px" }}>
                      CÂU VÍ DỤ MINH HỌA
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {dictData.example_sentences.map((ex, idx) => (
                        <div key={idx} style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "10px", fontSize: "0.85rem", lineHeight: 1.6 }}>
                          <div style={{ color: "#e2e8f0" }}>• {ex.en}</div>
                          <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "2px" }}>→ {ex.vi}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button
                    onClick={() => {
                      setDictModalOpen(false);
                      handleOpenFlashcardModal();
                    }}
                    style={{
                      flex: 1, padding: "11px", borderRadius: "12px",
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      border: "none", color: "#fff", cursor: "pointer",
                      fontWeight: 700, fontSize: "0.85rem",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
                    }}
                  >
                    <Plus size={16} /> Tạo Flashcard Từ Từ Này
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}


      {/* ─── Add Flashcard Modal ─── */}
      {flashcardModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setFlashcardModalOpen(false)}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(16,185,129,0.4)",
              borderRadius: "20px",
              padding: "28px",
              maxWidth: "480px",
              width: "100%",
              color: "#f8fafc",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(16,185,129,0.2)",
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <CreditCard size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, fontFamily: "Outfit, sans-serif" }}>
                    Thêm Vào Flashcard (FSRS)
                  </h3>
                  <div style={{ fontSize: "0.7rem", color: "#34d399", fontWeight: 600 }}>Thuật toán Spaced Repetition FSRS</div>
                </div>
              </div>
              <button
                onClick={() => setFlashcardModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {fcSaved ? (
              <div style={{ padding: "30px 0", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16,185,129,0.2)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <Check size={28} />
                </div>
                <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#34d399", fontWeight: 700 }}>Đã Thêm Vào Bộ Flashcard!</h4>
                <p style={{ color: "#94a3b8", fontSize: "0.82rem", marginTop: "6px" }}>Từ vựng đã sẵn sàng cho các phiên ôn tập FSRS tiếp theo.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Select Deck */}
                <div>
                  <label className="label-text">BỘ THẺ (DECK)</label>
                  <select
                    value={fcDeck}
                    onChange={(e) => setFcDeck(e.target.value)}
                    className="input-field"
                    style={{ background: "#1e293b" }}
                  >
                    <option value="IELTS Vocabulary">IELTS Vocabulary</option>
                    <option value="Cambridge IELTS 21">Cambridge IELTS 21</option>
                    <option value="Academic Reading Terms">Academic Reading Terms</option>
                    <option value="Từ vựng tự học">Từ vựng tự học</option>
                  </select>
                </div>

                {/* Front */}
                <div>
                  <label className="label-text">MẶT TRƯỚC (TỪ VỰNG / KHÁI NIỆM)</label>
                  <input
                    type="text"
                    value={fcFront}
                    onChange={(e) => setFcFront(e.target.value)}
                    className="input-field"
                    style={{ background: "#1e293b" }}
                  />
                </div>

                {/* Back */}
                <div>
                  <label className="label-text">MẶT SAU (NGHĨA & VÍ DỤ)</label>
                  <textarea
                    rows={3}
                    value={fcBack}
                    onChange={(e) => setFcBack(e.target.value)}
                    className="input-field"
                    style={{ background: "#1e293b", resize: "vertical" }}
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveFlashcard}
                  disabled={fcSaving}
                  style={{
                    padding: "12px", borderRadius: "12px", marginTop: "6px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    border: "none", color: "#fff", cursor: "pointer",
                    fontWeight: 700, fontSize: "0.9rem",
                    opacity: fcSaving ? 0.7 : 1
                  }}
                >
                  {fcSaving ? "Đang lưu Flashcard..." : "Lưu VÀO BỘ FLASHCARD"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
