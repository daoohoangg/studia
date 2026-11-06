"use client";

/** CSS của trình đọc ebook (tách riêng khỏi trang để trang chỉ giữ logic). */
export default function ReaderStyles() {
  return (
    <style jsx global>{`
      .reader-root { min-height: 100vh; margin: -40px -48px; padding-bottom: 120px; transition: background 0.2s ease, color 0.2s ease, padding 0.2s ease; }
      @media (max-width: 768px) {
        .reader-root { margin: -72px -16px; }
      }
      .reader-root.with-pane { padding-right: 440px; }
      .reader-root.with-toc-pinned { padding-left: 330px; }
      @media (max-width: 1024px) {
        .reader-root.with-toc-pinned { padding-left: 0; }
      }
      .reader-toolbar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
        padding: 10px 16px; background: var(--bg-card); color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); }
      .reader-title { flex: 1; min-width: 120px; font-weight: 700; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 8px; }
      .reader-tool { background: transparent; border: 1px solid var(--border-subtle); color: var(--text-secondary); border-radius: 8px;
        padding: 6px 12px; font-size: 0.82rem; font-weight: 600; cursor: pointer; text-decoration: none; font-family: inherit; white-space: nowrap; }
      .reader-tool:hover:not(:disabled) { background: var(--bg-card-hover); color: var(--text-primary); }
      .reader-tool:disabled { opacity: 0.4; cursor: not-allowed; }
      .reader-tool.active { border-color: var(--primary); color: var(--primary); }
      .reader-zoom-group { display: inline-flex; align-items: center; border: 1px solid var(--border-subtle); border-radius: 8px; overflow: hidden; background: var(--bg-card); }
      .reader-zoom-group .reader-tool { border: none; border-radius: 0; padding: 6px 10px; margin: 0; }
      .reader-zoom-group .reader-zoom-val { font-variant-numeric: tabular-nums; min-width: 54px; text-align: center; border-left: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle); font-weight: 700; font-size: 0.82rem; }
      .reader-zoom-group .reader-zoom-btn { font-size: 0.95rem; font-weight: 700; padding: 6px 10px; }
      .reader-zoom-group .reader-tool:hover:not(:disabled) { background: var(--bg-card-hover); }
      .reader-progress { font-size: 0.78rem; color: var(--text-muted); min-width: 36px; text-align: right; }
      .reader-banner { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 0.8rem; padding: 8px 16px;
        background: rgba(var(--primary-rgb), 0.1); color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); font-family: inherit; }
      .reader-page { margin: 0 auto; padding: 36px clamp(20px, 3.5vw, 48px) 0; width: 100%; box-sizing: border-box; overflow-wrap: break-word; transition: max-width 0.15s ease; }
      @media (max-width: 768px) {
        .reader-page { padding: 24px 16px 0; }
      }
      .reader-empty { text-align: center; opacity: 0.7; padding: 48px 0; font-size: 0.95rem; }
      .reader-block { position: relative; margin: 0 0 1.15em; border-radius: 6px; scroll-margin-top: 90px; width: 100%; }
      .reader-block.editable { cursor: text; outline: 1px dashed transparent; outline-offset: 4px; }
      .reader-block.editable:hover { outline-color: currentColor; }
      .reader-block h2, .reader-block h3, .reader-block h4 { margin: 1.6em 0 0.5em; line-height: 1.35; font-family: inherit; text-align: left; letter-spacing: -0.01em; }
      .reader-block h2 {
        font-size: 1.65em;
        font-weight: 800;
        color: var(--primary);
        border-left: 5px solid var(--primary);
        background: rgba(var(--primary-rgb, 14, 165, 233), 0.08);
        padding: 8px 14px;
        border-radius: 0 8px 8px 0;
        box-shadow: inset 0 -1px 0 rgba(var(--primary-rgb, 14, 165, 233), 0.15);
      }
      .reader-block h3 {
        font-size: 1.32em;
        font-weight: 700;
        color: var(--text-primary);
        border-left: 4px solid var(--accent-teal, #0d9488);
        background: rgba(13, 148, 136, 0.07);
        padding: 6px 12px;
        border-radius: 0 6px 6px 0;
      }
      .reader-block h4 {
        font-size: 1.15em;
        font-weight: 700;
        color: var(--text-primary);
        border-left: 3px solid var(--border-subtle);
        padding-left: 10px;
      }
      .reader-block strong {
        font-weight: 700;
        color: var(--text-primary);
      }
      .reader-block mark {
        border-radius: 4px;
        padding: 1px 4px;
        transition: background-color 0.15s ease;
      }
      .reader-block p { margin: 0; text-align: justify; text-justify: inter-word; hyphens: auto; }
      .reader-block.list p { padding-left: 1.4em; text-indent: -1em; text-align: left; }
      .reader-block table { border-collapse: collapse; font-size: 0.9em; width: 100%; margin: 0.8em 0; }
      .reader-block td { border: 1px solid currentColor; padding: 4px 10px; vertical-align: top; }
      .reader-block tr:first-child td { font-weight: 700; }
      .reader-block mark[data-hid] { cursor: pointer; }
      .reader-flash { animation: readerFlash 1.6s ease; }
      @keyframes readerFlash { 0%, 60% { background: var(--marker); } 100% { background: transparent; } }
      .reader-marker { position: absolute; right: -18px; top: 0.5em; width: 8px; height: 8px; border-radius: 50%; border: none; padding: 0; cursor: pointer; background: var(--accent-strong); }
      .reader-marker.edited { right: -32px; background: var(--primary); cursor: default; }

      .reader-drawer { position: fixed; top: 0; bottom: 0; width: min(380px, 92vw); z-index: 75; overflow-y: auto; padding: 16px;
        background: var(--bg-card); color: var(--text-primary); box-shadow: var(--shadow-2); font-family: var(--font-sans, inherit); font-size: 0.875rem; line-height: 1.5;
        transition: left 0.2s ease, width 0.2s ease; }
      .reader-drawer.left { left: var(--sidebar, 248px); border-right: 1px solid var(--border-subtle); }
      .app-main.collapsed .reader-drawer.left { left: var(--sidebar-collapsed, 72px); }
      .reader-drawer.left.pinned { width: 320px; z-index: 34; box-shadow: none; border-right: 1px solid var(--border-subtle); }
      @media (max-width: 1024px) {
        .reader-drawer.left.pinned { z-index: 75; box-shadow: var(--shadow-2); width: min(360px, 92vw); }
      }
      @media (max-width: 768px) {
        .reader-drawer { top: 56px; bottom: 56px; width: 100vw; z-index: 85; }
        .reader-drawer.left { left: 0; }
        .app-main.collapsed .reader-drawer.left { left: 0; }
      }
      .reader-drawer.right { right: 0; border-left: 1px solid var(--border-subtle); }
      .reader-pin-btn { background: transparent; border: 1px solid var(--border-subtle); color: var(--text-secondary); border-radius: 6px;
        padding: 4px 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s ease; font-family: inherit; }
      .reader-pin-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); border-color: var(--border-input); }
      .reader-pin-btn.active { background: rgba(var(--primary-rgb, 14, 165, 233), 0.12); border-color: var(--primary); color: var(--primary); font-weight: 700; }
      .reader-pane { position: fixed; top: 0; bottom: 0; right: 0; width: 420px; max-width: 92vw; z-index: 35; overflow-y: auto; padding: 16px;
        background: var(--bg-card); color: var(--text-primary); border-left: 1px solid var(--border-subtle);
        font-family: var(--font-sans, inherit); font-size: 0.875rem; }
      .reader-pane-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-weight: 600; }
      .reader-drawer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; font-weight: 700; font-size: 1rem; }
      .reader-toc-item { display: flex; justify-content: space-between; gap: 12px; width: 100%; text-align: left; background: transparent; border: none;
        color: var(--text-primary); padding: 7px 8px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-family: inherit; }
      .reader-toc-item:hover { background: var(--bg-card-hover); }
      .toc-chapter { align-items: flex-start; }
      .toc-chapter.current { background: var(--bg-card-hover); box-shadow: inset 3px 0 0 var(--primary); }
      .toc-chapter-title { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
      .toc-chapter-bar { display: block; height: 4px; border-radius: 4px; background: var(--border-subtle); overflow: hidden; }
      .toc-chapter-bar i { display: block; height: 100%; background: var(--primary); border-radius: 4px; }
      .reader-original { margin: 18px 0; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--bg-card, transparent); }
      .reader-original-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 0.8rem; font-weight: 600; margin-bottom: 8px; font-family: var(--font-sans, inherit); }
      .reader-original img { display: block; width: 100%; height: auto; border-radius: 6px; background: #fff; }
      .reader-original-skeleton { height: 360px; border-radius: 6px; background: var(--border-subtle); opacity: .5; }
      .reader-hit { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; background: transparent; border: 1px solid var(--border-subtle);
        color: var(--text-primary); padding: 8px 10px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-family: inherit; }
      .reader-hit:hover { background: var(--bg-card-hover); }
      .reader-muted { color: var(--text-muted); font-size: 0.78rem; }
      .reader-label { display: block; margin: 18px 0 8px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); }
      .reader-options { display: flex; flex-direction: column; gap: 6px; } .reader-options.row { flex-direction: row; flex-wrap: wrap; }
      .reader-options.row .reader-option { text-align: center; }
      .reader-option { flex: 1; text-align: left; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); background: transparent;
        color: var(--text-primary); cursor: pointer; font-size: 0.85rem; }
      .reader-option.active { border-color: var(--primary); color: var(--primary); font-weight: 700; }
      .reader-swatches { display: flex; gap: 10px; flex-wrap: wrap; }
      .reader-swatch { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--border-input); cursor: pointer; padding: 0; }
      .reader-swatch.active { border-color: var(--primary); box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 4px var(--primary); }
      .reader-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
      .reader-tabs button { flex: 1; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--border-subtle); background: transparent;
        color: var(--text-secondary); cursor: pointer; font-size: 0.82rem; font-weight: 600; font-family: inherit; }
      .reader-tabs button.active { border-color: var(--primary); color: var(--primary); }
      .reader-input { width: 100%; border-radius: 8px; border: 1px solid var(--border-input); background: var(--bg-secondary); color: var(--text-primary);
        padding: 9px 12px; font-family: inherit; font-size: 0.9rem; }
      .reader-textarea { width: 100%; border-radius: 8px; border: 1px solid var(--border-input); background: var(--bg-secondary); color: var(--text-primary);
        padding: 10px 12px; font-family: inherit; font-size: 0.9rem; line-height: 1.5; resize: vertical; }
      .reader-primary { margin-top: 8px; padding: 8px 14px; border-radius: 8px; border: none; background: var(--primary); color: var(--on-brand); font-weight: 700; cursor: pointer; font-size: 0.82rem; font-family: inherit; }
      .reader-primary:disabled { opacity: 0.45; cursor: not-allowed; }
      .reader-link { background: none; border: none; padding: 0; color: var(--primary); cursor: pointer; font-size: 0.78rem; font-family: inherit; }
      .reader-link:disabled { opacity: 0.45; cursor: not-allowed; }
      .reader-link.danger { color: var(--accent-rose); }
      .reader-dot { width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--border-input); padding: 0; cursor: pointer; outline-offset: 2px; }
      .reader-quote { margin: 0 0 10px; padding: 8px 12px; border-left: 3px solid var(--accent-strong); background: var(--bg-card-hover); border-radius: 0 6px 6px 0;
        font-size: 0.82rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
      .reader-note { border: 1px solid var(--border-subtle); border-radius: 10px; padding: 12px; margin-bottom: 10px; }
      .reader-note-content { white-space: pre-wrap; margin: 0 0 8px; }
      .reader-note-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
      .reader-editor { margin: 0 0 1em; padding: 12px; border-radius: 10px; border: 1px solid var(--primary); background: var(--bg-card); color: var(--text-primary);
        font-family: var(--font-sans, system-ui, sans-serif); font-size: 0.875rem; line-height: 1.5; }
      .reader-editor-bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
      .reader-editor-bar select, .reader-editor-bar button { padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border-input); background: var(--bg-secondary);
        color: var(--text-primary); font-size: 0.8rem; cursor: pointer; font-family: inherit; }
      .reader-revisions { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
      .reader-revision { border: 1px solid var(--border-subtle); border-radius: 8px; padding: 8px 10px; }
      .reader-revision-text { margin: 4px 0 6px; font-size: 0.82rem; white-space: pre-wrap; }
      .reader-popover { position: fixed; z-index: 70; display: flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 10px;
        background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-2); font-family: var(--font-sans, inherit); font-size: 0.8rem; }
      .reader-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 60; background: var(--text-primary); color: var(--bg-card);
        padding: 10px 18px; border-radius: 10px; font-size: 0.85rem; box-shadow: var(--shadow-2); }
      @media print {
        aside, nav, .reader-toolbar, .reader-banner, .reader-drawer, .reader-pane, .reader-marker, .reader-toast, .reader-popover { display: none !important; }
        main { margin-left: 0 !important; padding: 0 !important; }
        .reader-root { margin: 0 !important; padding: 0 !important; background: #fff !important; color: #000 !important; }
        .reader-page { max-width: none !important; padding: 0 !important; }
        .reader-block { break-inside: avoid; }
        .reader-block h2, .reader-block h3, .reader-block h4 { break-after: avoid; }
      }
      @media (max-width: 900px) { .reader-root.with-pane { padding-right: 0; } }
      @media (max-width: 640px) { .reader-marker { right: -12px; } .reader-marker.edited { right: -12px; top: 1.6em; } }
    `}</style>
  );
}
