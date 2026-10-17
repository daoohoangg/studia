"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { API, apiFetch } from "@/lib/api";
import {
  DEFAULT_PREFS, EbookBlock, EbookHighlight, EbookNote, FONT_SIZE_RANGE, HIGHLIGHT_COLORS, HIGHLIGHT_SWATCH,
  BlockRevision, OutlineItem, PageIssue, TocData, READER_FONTS, READER_THEMES, READER_WIDTHS, ReaderPrefs, ResolvedHighlight,
  loadPrefs, plainText, resolveHighlight, savePrefs, toggleBoldByPlainRange,
} from "@/lib/ebook";
import BlockView from "@/components/ebook/BlockView";
import BlockEditor from "@/components/ebook/BlockEditor";
import ReaderStyles from "@/components/ebook/ReaderStyles";
import {
  InlineOriginal, NoteDraft, NotesPanel, PageImagePane, SearchPanel, SettingsPanel, TocPanel,
} from "@/components/ebook/ReaderPanels";

const PAGE_SIZE = 300;
const IDLE_REINDEX_MS = 30000;
const PROGRESS_SAVE_MS = 1500;

type Panel = "toc" | "search" | "notes" | "settings" | null;
type IndexState = "clean" | "dirty" | "updating";

const JSON_HEADERS = { "Content-Type": "application/json" };

export default function BookReaderPage() {
  const params = useParams();
  const bookId = params.id as string;
  const base = `${API}/documents/${bookId}`;

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [blocks, setBlocks] = useState<EbookBlock[]>([]);
  const [loadingMore, setLoadingMore] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processingNote, setProcessingNote] = useState<string | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [toc, setToc] = useState<TocData | null>(null);
  const [pageIssues, setPageIssues] = useState<Map<number, PageIssue[]>>(new Map());
  const [notes, setNotes] = useState<EbookNote[]>([]);
  const [highlights, setHighlights] = useState<EbookHighlight[]>([]);
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [panel, setPanel] = useState<Panel>(null);
  const [notesTab, setNotesTab] = useState<"notes" | "highlights">("notes");
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<NoteDraft>({ quote: null, blockId: null, content: "" });
  const [toast, setToast] = useState<string | null>(null);
  const [indexState, setIndexState] = useState<IndexState>("clean");
  const [paneOpen, setPaneOpen] = useState(false);
  const [panePage, setPanePage] = useState<number | null>(null);
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ id: string; x: number; y: number } | null>(null);

  const blocksRef = useRef<EbookBlock[]>([]);
  blocksRef.current = blocks;
  const restoredRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reindexingRef = useRef(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 3500);
  }, []);

  useEffect(() => { setPrefs(loadPrefs()); }, []);
  const updatePrefs = (changes: Partial<ReaderPrefs> | ((current: ReaderPrefs) => Partial<ReaderPrefs>)) => {
    setPrefs((current) => {
      const next = { ...current, ...(typeof changes === "function" ? changes(current) : changes) };
      savePrefs(next);
      return next;
    });
  };

  const fetchOutline = useCallback(async () => {
    const [outlineRes, tocRes, qualityRes] = await Promise.all([
      apiFetch(`${base}/outline`), apiFetch(`${base}/toc`), apiFetch(`${base}/page-quality`),
    ].map((p) => p.catch(() => null)));
    if (outlineRes?.ok) setOutline((await outlineRes.json()).outline || []);
    if (tocRes?.ok) setToc(await tocRes.json());
    if (qualityRes?.ok) {
      const pages: { page: number; reasons: PageIssue[] }[] = (await qualityRes.json()).pages || [];
      setPageIssues(new Map(pages.map((p) => [p.page, p.reasons])));
    }
  }, [base]);

  // ─── Chỉ mục AI: tự cập nhật khi người dùng ngừng sửa ───────
  const runReindex = useCallback(async () => {
    if (reindexingRef.current) return;
    reindexingRef.current = true;
    setIndexState("updating");
    try {
      const res = await apiFetch(`${base}/reindex`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setIndexState("clean");
        notify(result.chunks_reembedded > 0
          ? `Đã cập nhật chỉ mục AI (${result.chunks_reembedded} đoạn thay đổi).`
          : "Chỉ mục AI đã khớp với nội dung.");
      } else {
        setIndexState("dirty");
        if (res.status !== 409) notify("Chưa cập nhật được chỉ mục AI. Thử lại sau.");
      }
    } catch {
      setIndexState("dirty");
    } finally {
      reindexingRef.current = false;
    }
  }, [base, notify]);

  const markDirty = useCallback(() => {
    setIndexState((state) => (state === "updating" ? state : "dirty"));
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => runReindex(), IDLE_REINDEX_MS);
  }, [runReindex]);

  useEffect(() => () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (progressTimer.current) clearTimeout(progressTimer.current);
  }, []);

  // ─── Tải nội dung theo từng lô; sách đang xử lý thì chờ tới khi có khối đầu tiên ───
  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    restoredRef.current = false;

    (async () => {
      let after = -1;
      let loaded: EbookBlock[] = [];
      let completed = false;
      setBlocks([]);
      setLoadingMore(true);
      setLoadError(null);
      try {
        while (!cancelled) {
          const statusRes = await apiFetch(`${base}/status`);
          if (statusRes.status === 404) { setLoadError("Không tìm thấy tài liệu."); return; }
          const doc = statusRes.ok ? await statusRes.json() : {};
          if (cancelled) return;
          setTitle(doc.title || "");
          setStatus(doc.processing_status || "");
          completed = doc.processing_status === "completed";
          const inProgress = doc.processing_status === "processing" || doc.processing_status === "pending";
          setProcessingNote(inProgress ? (doc.processing_detail || "Studia đang xử lý sách") : null);

          const res = await apiFetch(`${base}/blocks?after=${after}&limit=${PAGE_SIZE}`);
          if (!res.ok) throw new Error(String(res.status));
          const page = await res.json();
          if (cancelled) return;

          if (page.blocks.length === 0 && loaded.length === 0) {
            if (doc.processing_status === "failed") { setLoadError("Không tách được nội dung của tài liệu này."); return; }
            if (doc.processing_status === "completed") { setLoadError("Tài liệu này chưa có nội dung để đọc."); return; }
            await wait(1500); // đang tách nội dung
            continue;
          }
          if (page.blocks.length > 0) {
            loaded = [...loaded, ...page.blocks];
            setBlocks(loaded);
            setLoadingMore(false); // đã có nội dung để đọc, phần còn lại hiện dần
            if (inProgress) fetchOutline();
          }
          after = page.next_after;
          if (!page.has_more) {
            if (inProgress) { await wait(2500); continue; } // sách còn đang xử lý: chờ thêm trang mới
            break;
          }
        }
        if (cancelled) return;
        fetchOutline();
        if (completed) {
          // Sửa ở phiên trước chưa kịp lập chỉ mục → hiện thanh cập nhật
          apiFetch(`${base}/index-status`).then(async (r) => {
            if (r.ok && !cancelled && (await r.json()).stale) markDirty();
          }).catch(() => {});
        }
      } catch {
        if (!cancelled) setLoadError("Không tải được nội dung. Kiểm tra kết nối rồi thử lại.");
      } finally {
        if (!cancelled) setLoadingMore(false);
      }
    })();

    apiFetch(`${base}/notes`).then(async (res) => {
      if (res.ok && !cancelled) setNotes((await res.json()).notes || []);
    }).catch(() => {});
    apiFetch(`${base}/highlights`).then(async (res) => {
      if (res.ok && !cancelled) setHighlights((await res.json()).highlights || []);
    }).catch(() => {});

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, base]);

  const jumpTo = useCallback((blockId: string | null) => {
    if (!blockId) return;
    const el = document.getElementById(`blk-${blockId}`);
    if (!el) { notify("Đoạn này chưa tải xong hoặc đã bị xoá."); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("reader-flash");
    setTimeout(() => el.classList.remove("reader-flash"), 1600);
  }, [notify]);

  // ─── Vị trí đang đọc: khôi phục một lần, rồi lưu khi cuộn ───
  useEffect(() => {
    if (loadingMore || blocks.length === 0 || restoredRef.current) return;
    restoredRef.current = true;
    (async () => {
      try {
        // Mở từ mục lục ở trang sách (?chapter=<block_id>): vào đúng chương đó thay vì chỗ đang đọc dở
        const chapter = new URLSearchParams(window.location.search).get("chapter");
        if (chapter && blocksRef.current.some((b) => b.id === chapter)) {
          requestAnimationFrame(() => document.getElementById(`blk-${chapter}`)?.scrollIntoView({ block: "start" }));
          return;
        }
        const res = await apiFetch(`${base}/progress`);
        if (!res.ok) return;
        const progress = await res.json();
        const index = blocksRef.current.findIndex((b) => b.id === progress.block_id);
        if (index > 2) {
          requestAnimationFrame(() => {
            document.getElementById(`blk-${progress.block_id}`)?.scrollIntoView({ block: "start" });
            notify(`Tiếp tục từ chỗ bạn đang đọc (${Math.round(progress.percent)}%).`);
          });
        }
      } catch { /* không có vị trí đã lưu */ }
    })();
  }, [loadingMore, blocks.length, base, notify]);

  useEffect(() => {
    if (blocks.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setCurrentBlockId(entry.target.id.replace("blk-", ""));
      }
    }, { rootMargin: "-10% 0px -80% 0px" });
    document.querySelectorAll(".reader-block").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [blocks.length, editMode]);

  const currentIndex = useMemo(
    () => blocks.findIndex((b) => b.id === currentBlockId), [blocks, currentBlockId],
  );
  const percent = blocks.length > 0 && currentIndex >= 0 ? Math.round(((currentIndex + 1) / blocks.length) * 100) : 0;

  useEffect(() => {
    setPanePage(null);
    if (!currentBlockId || !restoredRef.current) return;
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => {
      apiFetch(`${base}/progress`, {
        method: "PUT", headers: JSON_HEADERS,
        body: JSON.stringify({ block_id: currentBlockId, percent }),
      }).catch(() => {});
    }, PROGRESS_SAVE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBlockId]);

  const hasPages = useMemo(() => blocks.some((b) => b.page_number), [blocks]);
  const maxPage = useMemo(() => blocks.reduce((m, b) => Math.max(m, b.page_number || 0), 0), [blocks]);
  const currentPage = (currentIndex >= 0 ? blocks[currentIndex].page_number : null) || 1;
  const currentOrder = currentIndex >= 0 ? blocks[currentIndex].order_index : null;
  // Ảnh trang gốc xen trước khối đầu tiên của mỗi trang cần/được yêu cầu hiển thị
  const originalBefore = useMemo(() => {
    const map = new Map<string, number>();
    if (prefs.originals === "off") return map;
    let lastPage: number | null = null;
    for (const b of blocks) {
      if (b.page_number && b.page_number !== lastPage) {
        lastPage = b.page_number;
        if (prefs.originals === "all" || pageIssues.has(b.page_number)) map.set(b.id, b.page_number);
      }
    }
    return map;
  }, [blocks, prefs.originals, pageIssues]);
  const shownPage = panePage ?? currentPage;

  // ─── Highlight theo khối (định vị lại theo chữ khi khối đã sửa) ───
  const blockMap = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);
  const highlightsByBlock = useMemo(() => {
    const map = new Map<string, ResolvedHighlight[]>();
    for (const highlight of highlights) {
      const block = blockMap.get(highlight.block_id);
      if (!block) continue;
      const resolved = resolveHighlight(plainText(block.text), highlight);
      if (!resolved) continue;
      map.set(highlight.block_id, [...(map.get(highlight.block_id) || []), resolved]);
    }
    return map;
  }, [highlights, blockMap]);

  const highlightText = (highlight: EbookHighlight) => {
    const block = blockMap.get(highlight.block_id);
    if (!block) return "";
    const plain = plainText(block.text);
    const resolved = resolveHighlight(plain, highlight);
    return resolved ? plain.slice(resolved.start, resolved.end) : "";
  };

  const addHighlight = useCallback(async (blockId: string, start: number, end: number, color: string, quote: string) => {
    const res = await apiFetch(`${base}/highlights`, {
      method: "POST", headers: JSON_HEADERS,
      body: JSON.stringify({ block_id: blockId, start, end, color, quote }),
    });
    if (!res.ok) { notify("Không lưu được highlight."); return; }
    const created: EbookHighlight = await res.json();
    setHighlights((current) => [...current, created]);
  }, [base, notify]);

  const changeHighlightColor = async (highlightId: string, color: string) => {
    const res = await apiFetch(`${base}/highlights/${highlightId}`, {
      method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ color }),
    });
    if (!res.ok) { notify("Không đổi được màu."); return; }
    const updated: EbookHighlight = await res.json();
    setHighlights((current) => current.map((h) => (h.id === highlightId ? { ...h, ...updated } : h)));
  };

  const deleteHighlight = async (highlightId: string) => {
    const res = await apiFetch(`${base}/highlights/${highlightId}`, { method: "DELETE" });
    if (!res.ok) { notify("Không xoá được highlight."); return; }
    setHighlights((current) => current.filter((h) => h.id !== highlightId));
    setPopover(null);
  };

  // Bấm vào chữ đã highlight → hộp đổi màu / xoá
  const onPageClick = (event: React.MouseEvent) => {
    if (editMode) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    const mark = (event.target as HTMLElement).closest<HTMLElement>("mark[data-hid]");
    if (!mark?.dataset.hid) return;
    setPopover({ id: mark.dataset.hid, x: Math.min(event.clientX, window.innerWidth - 260), y: event.clientY + 12 });
  };

  useEffect(() => {
    if (!popover) return;
    const close = (e: Event) => {
      if (!(e.target as HTMLElement).closest(".reader-popover")) setPopover(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPopover(null); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", onKey); };
  }, [popover]);

  // ─── Sửa khối ───────────────────────────────────────────────
  const patchBlock = useCallback(async (blockId: string, changes: Partial<EbookBlock>) => {
    const res = await apiFetch(`${base}/blocks/${blockId}`, {
      method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(changes),
    });
    if (!res.ok) { notify("Không lưu được thay đổi."); return false; }
    const updated: EbookBlock = await res.json();
    setBlocks((current) => current.map((b) => (b.id === blockId ? updated : b)));
    if (updated.block_type === "heading" || "block_type" in changes) fetchOutline();
    markDirty();
    return true;
  }, [base, notify, fetchOutline, markDirty]);

  /** Lưu chữ đang gõ dở trước khi tách/gộp, để vị trí con trỏ khớp với nội dung trên server. */
  const flushPendingText = async (blockId: string, text: string) => {
    const block = blocksRef.current.find((b) => b.id === blockId);
    if (!block || block.text === text) return true;
    return patchBlock(blockId, { text });
  };

  const restoreBlock = async (blockId: string) => {
    const res = await apiFetch(`${base}/blocks/${blockId}/restore`, { method: "POST" });
    if (!res.ok) { notify("Khối này không có bản gốc để khôi phục."); return; }
    const updated: EbookBlock = await res.json();
    setBlocks((current) => current.map((b) => (b.id === blockId ? updated : b)));
    setEditingId(null);
    fetchOutline();
    markDirty();
  };

  const deleteBlock = async (blockId: string) => {
    if (!window.confirm("Xoá đoạn này khỏi sách?")) return;
    const res = await apiFetch(`${base}/blocks/${blockId}`, { method: "DELETE" });
    if (!res.ok) { notify("Không xoá được."); return; }
    setBlocks((current) => current.filter((b) => b.id !== blockId));
    setHighlights((current) => current.filter((h) => h.block_id !== blockId));
    setEditingId(null);
    fetchOutline();
    markDirty();
  };

  const insertAfter = async (blockId: string) => {
    const res = await apiFetch(`${base}/blocks`, {
      method: "POST", headers: JSON_HEADERS,
      body: JSON.stringify({ after_block_id: blockId, text: "", block_type: "paragraph" }),
    });
    if (!res.ok) { notify("Không thêm được đoạn mới."); return; }
    const created: EbookBlock = await res.json();
    setBlocks((current) => {
      const index = current.findIndex((b) => b.id === blockId);
      return [...current.slice(0, index + 1), created, ...current.slice(index + 1)];
    });
    setEditingId(created.id);
    markDirty();
  };

  const splitBlock = async (blockId: string, text: string, offset: number) => {
    if (!(await flushPendingText(blockId, text))) return;
    const res = await apiFetch(`${base}/blocks/${blockId}/split`, {
      method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ offset }),
    });
    if (!res.ok) { notify((await res.json().catch(() => ({}))).detail || "Không tách được đoạn."); return; }
    const { block, new_block } = await res.json();
    setBlocks((current) => {
      const index = current.findIndex((b) => b.id === blockId);
      return [...current.slice(0, index), block, new_block, ...current.slice(index + 1)];
    });
    setEditingId(null);
    markDirty();
  };

  const mergePrevious = async (blockId: string, text: string) => {
    if (!(await flushPendingText(blockId, text))) return;
    const res = await apiFetch(`${base}/blocks/${blockId}/merge-previous`, { method: "POST" });
    if (!res.ok) { notify((await res.json().catch(() => ({}))).detail || "Không gộp được đoạn."); return; }
    const { block, removed_id } = await res.json();
    setBlocks((current) => current.filter((b) => b.id !== removed_id).map((b) => (b.id === block.id ? block : b)));
    setHighlights((current) => current.filter((h) => h.block_id !== removed_id));
    setEditingId(null);
    fetchOutline();
    markDirty();
  };

  const loadRevisions = async (blockId: string): Promise<BlockRevision[]> => {
    const res = await apiFetch(`${base}/blocks/${blockId}/revisions`);
    return res.ok ? (await res.json()).revisions || [] : [];
  };

  const restoreRevision = async (blockId: string, revisionId: string) => {
    const res = await apiFetch(`${base}/blocks/${blockId}/revisions/${revisionId}/restore`, { method: "POST" });
    if (!res.ok) { notify("Không khôi phục được phiên bản này."); return; }
    const updated: EbookBlock = await res.json();
    setBlocks((current) => current.map((b) => (b.id === blockId ? updated : b)));
    setEditingId(null);
    fetchOutline();
    markDirty();
  };

  // ─── Sổ ghi chú ─────────────────────────────────────────────
  const saveNote = async () => {
    const content = noteDraft.content.trim();
    if (!content) return;
    const res = await apiFetch(`${base}/notes`, {
      method: "POST", headers: JSON_HEADERS,
      body: JSON.stringify({ content, quote: noteDraft.quote, block_id: noteDraft.blockId }),
    });
    if (!res.ok) { notify("Không lưu được ghi chú."); return; }
    const created: EbookNote = await res.json();
    setNotes((current) => [created, ...current]);
    setNoteDraft({ quote: null, blockId: null, content: "" });
  };

  const updateNote = async (noteId: string, content: string) => {
    const res = await apiFetch(`${base}/notes/${noteId}`, {
      method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ content }),
    });
    if (!res.ok) { notify("Không lưu được ghi chú."); return false; }
    const updated: EbookNote = await res.json();
    setNotes((current) => current.map((n) => (n.id === noteId ? updated : n)));
    return true;
  };

  const deleteNote = async (noteId: string) => {
    if (!window.confirm("Xoá ghi chú này?")) return;
    const res = await apiFetch(`${base}/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) setNotes((current) => current.filter((n) => n.id !== noteId));
    else notify("Không xoá được ghi chú.");
  };

  // ─── Xuất Markdown ──────────────────────────────────────────
  const exportMarkdown = async () => {
    const res = await apiFetch(`${base}/export?format=md`);
    if (!res.ok) { notify("Không xuất được file."); return; }
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(title || "sach").replace(/[\\/:*?"<>|]+/g, "_")}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ─── Hành động từ menu bôi đen (SelectionContextMenu) ───────
  useEffect(() => {
    const onSelectionAction = (event: Event) => {
      const { action, text, blockId, start, end, color } = (event as CustomEvent).detail || {};
      const block = blocksRef.current.find((b) => b.id === blockId);
      if (!block) return;
      if (action === "bold") {
        const next = toggleBoldByPlainRange(block.text, start, end);
        if (next !== block.text) patchBlock(block.id, { text: next });
      } else if (action === "highlight") {
        addHighlight(block.id, start, end, color || "yellow", (text || "").slice(0, 2000));
      } else if (action === "note") {
        setNoteDraft({ quote: text, blockId: block.id, content: "" });
        setNotesTab("notes");
        setPanel("notes");
      } else if (action === "ask") {
        const question = `Giải thích giúp mình đoạn sau trong sách "${title}": "${String(text).slice(0, 500)}"`;
        window.open(`/tutor?doc=${bookId}&q=${encodeURIComponent(question)}`, "_blank");
      }
    };
    window.addEventListener("studia:ebook-selection", onSelectionAction);
    return () => window.removeEventListener("studia:ebook-selection", onSelectionAction);
  }, [patchBlock, addHighlight, bookId, title]);

  const theme = READER_THEMES[prefs.theme];
  const notedBlockIds = useMemo(() => new Set(notes.map((n) => n.block_id).filter(Boolean)), [notes]);
  const togglePanel = (name: Exclude<Panel, null>) => setPanel((current) => (current === name ? null : name));
  const popoverHighlight = popover ? highlights.find((h) => h.id === popover.id) : null;

  return (
    <div className={`reader-root ${paneOpen && hasPages ? "with-pane" : ""}`} style={{ background: theme.background, color: theme.color }}>
      <div className="reader-toolbar">
        <Link href={`/books/${bookId}`} className="reader-tool">← Sách</Link>
        <div className="reader-title" title={title}>{title || "Đang tải..."}</div>
        {blocks.length > 0 && <span className="reader-progress" title="Vị trí đang đọc">{percent}%</span>}
        <button className={`reader-tool ${panel === "search" ? "active" : ""}`} onClick={() => togglePanel("search")}>Tìm</button>
        <button className={`reader-tool ${panel === "toc" ? "active" : ""}`} onClick={() => togglePanel("toc")}>Mục lục</button>
        <button className="reader-tool" onClick={() => updatePrefs((p) => ({ fontSize: Math.max(FONT_SIZE_RANGE.min, p.fontSize - 1) }))} title="Giảm cỡ chữ" aria-label="Giảm cỡ chữ">A−</button>
        <button className="reader-tool" onClick={() => updatePrefs((p) => ({ fontSize: Math.min(FONT_SIZE_RANGE.max, p.fontSize + 1) }))} title="Tăng cỡ chữ" aria-label="Tăng cỡ chữ">A+</button>
        <button className={`reader-tool ${panel === "settings" ? "active" : ""}`} onClick={() => togglePanel("settings")}>Hiển thị</button>
        {hasPages && (
          <button className={`reader-tool ${paneOpen ? "active" : ""}`} onClick={() => setPaneOpen((v) => !v)}
            title="Xem ảnh trang gốc của PDF để đối chiếu">Trang gốc</button>
        )}
        <button className={`reader-tool ${editMode ? "active" : ""}`} onClick={() => { setEditMode((v) => !v); setEditingId(null); }}>
          {editMode ? "Đang sửa" : "Chỉnh sửa"}
        </button>
        <button className={`reader-tool ${panel === "notes" ? "active" : ""}`} onClick={() => togglePanel("notes")}>
          Sổ tay{notes.length + highlights.length > 0 ? ` (${notes.length + highlights.length})` : ""}
        </button>
        <button className="reader-tool" onClick={exportMarkdown} title="Tải nội dung đã chỉnh sửa về dạng Markdown">Xuất .md</button>
        <button className="reader-tool" onClick={() => window.print()} title="In hoặc lưu thành PDF (chọn “Lưu thành PDF” trong hộp thoại in)">In / PDF</button>
      </div>

      {status && status !== "completed" && status !== "failed" && blocks.length > 0 && (
        <div className="reader-banner">AI vẫn đang phân tích tài liệu (chủ đề, flashcard). Bạn có thể đọc và chỉnh sửa ngay.</div>
      )}
      {indexState === "dirty" && (
        <div className="reader-banner">
          Nội dung đã thay đổi: chỉ mục AI (Tutor, tìm kiếm ngữ nghĩa) sẽ tự cập nhật sau khi bạn ngừng sửa khoảng 30 giây.
          <button className="reader-link" onClick={runReindex}>Cập nhật ngay</button>
        </div>
      )}
      {indexState === "updating" && <div className="reader-banner">Đang cập nhật chỉ mục AI...</div>}
      {processingNote && (
        <div className="reader-banner" role="status">
          Sách đang được xử lý: bạn đọc được phần đã xong, các trang còn lại sẽ hiện dần. <b>{processingNote}</b>
          <Link className="reader-link" href={`/books/${bookId}`}>Xem tiến trình</Link>
        </div>
      )}
      {editMode && (
        <div className="reader-banner">Chế độ chỉnh sửa: bấm vào một đoạn để sửa. Thay đổi được lưu vào sách; bản gốc luôn khôi phục được.</div>
      )}

      <div className="reader-page" onClick={onPageClick} style={{
        maxWidth: READER_WIDTHS[prefs.width].css,
        fontSize: `${prefs.fontSize}px`,
        fontFamily: READER_FONTS[prefs.fontFamily].css,
        lineHeight: prefs.lineHeight,
      }}>
        {loadError && <p className="reader-empty">{loadError}</p>}
        {!loadError && blocks.length === 0 && (
          <p className="reader-empty">{status === "pending" || status === "processing" ? "Đang tách nội dung tài liệu..." : "Đang tải nội dung..."}</p>
        )}

        {blocks.map((block) => (
          <Fragment key={block.id}>
          {originalBefore.has(block.id) && (
            <InlineOriginal base={base} page={originalBefore.get(block.id)!} issues={pageIssues.get(originalBefore.get(block.id)!) || []} />
          )}
          {editingId === block.id ? (
            <BlockEditor
              key={block.id}
              block={block}
              onSave={async (changes) => { if (await patchBlock(block.id, changes)) setEditingId(null); }}
              onCancel={() => setEditingId(null)}
              onRestore={() => restoreBlock(block.id)}
              onDelete={() => deleteBlock(block.id)}
              onInsertAfter={() => insertAfter(block.id)}
              onSplit={(text, offset) => splitBlock(block.id, text, offset)}
              onMergePrevious={(text) => mergePrevious(block.id, text)}
              loadRevisions={() => loadRevisions(block.id)}
              onRestoreRevision={(revisionId) => restoreRevision(block.id, revisionId)}
            />
          ) : (
            <BlockView
              key={block.id}
              block={block}
              highlights={highlightsByBlock.get(block.id) || []}
              editable={editMode}
              hasNote={notedBlockIds.has(block.id)}
              onEdit={() => setEditingId(block.id)}
              onOpenNotes={() => { setNotesTab("notes"); setPanel("notes"); }}
            />
          )}
          </Fragment>
        ))}

        {loadingMore && blocks.length > 0 && <p className="reader-empty">Đang tải phần tiếp theo...</p>}
      </div>

      {panel === "toc" && <TocPanel toc={toc} outline={outline} currentOrder={currentOrder} onJump={jumpTo} onClose={() => setPanel(null)} />}
      {panel === "search" && <SearchPanel base={base} onJump={jumpTo} onClose={() => setPanel(null)} />}
      {panel === "settings" && <SettingsPanel prefs={prefs} onChange={updatePrefs} onClose={() => setPanel(null)} />}
      {panel === "notes" && (
        <NotesPanel
          notes={notes} highlights={highlights} highlightText={highlightText}
          draft={noteDraft} onDraftChange={setNoteDraft} onSaveNote={saveNote}
          onUpdateNote={updateNote} onDeleteNote={deleteNote} onJump={jumpTo}
          onChangeHighlightColor={changeHighlightColor} onDeleteHighlight={deleteHighlight}
          onClose={() => setPanel(null)} tab={notesTab} onTab={setNotesTab}
        />
      )}
      {paneOpen && hasPages && (
        <PageImagePane base={base} page={shownPage} maxPage={maxPage} onPage={setPanePage} onClose={() => setPaneOpen(false)} />
      )}

      {popover && popoverHighlight && (
        <div className="reader-popover" style={{ left: popover.x, top: popover.y }}>
          {HIGHLIGHT_COLORS.map((color) => (
            <button key={color} className="reader-dot" title={HIGHLIGHT_SWATCH[color].label}
              aria-label={`Đổi sang màu ${HIGHLIGHT_SWATCH[color].label}`}
              style={{ background: HIGHLIGHT_SWATCH[color].bg, outline: popoverHighlight.color === color ? "2px solid var(--primary)" : "none" }}
              onClick={() => { changeHighlightColor(popoverHighlight.id, color); setPopover(null); }} />
          ))}
          <button className="reader-link danger" onClick={() => deleteHighlight(popoverHighlight.id)}>Xoá highlight</button>
        </div>
      )}

      {toast && <div className="reader-toast" role="status">{toast}</div>}
      <ReaderStyles />
    </div>
  );
}
