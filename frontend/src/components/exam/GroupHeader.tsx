"use client";

/** Câu lệnh, tiêu đề và giới hạn số từ của một nhóm câu hỏi; hiện trước câu đầu của nhóm. */
export default function GroupHeader({ item, prev }: { item: any; prev?: any }) {
  const instruction: string | undefined = item.group_instruction;
  if (!instruction) return null;
  const sameGroup = prev && prev.group_instruction === instruction && prev.group_title === item.group_title
    && prev.options_title === item.options_title;
  if (sameGroup) return null;

  return (
    <div style={{
      background: "var(--brand-tint)", border: "1px solid var(--brand-tint)", borderRadius: "12px", padding: "14px 18px",
      marginTop: "8px", color: "var(--ink)", fontSize: "0.9rem", lineHeight: 1.6,
    }}>
      <div style={{ fontWeight: 700 }}>{instruction}</div>
      {item.word_limit ? (
        <div style={{ fontSize: "0.8rem", marginTop: "4px", color: "var(--brand-hover)" }}>
          Tối đa {item.word_limit} từ{item.allow_number ? " và/hoặc một số" : ""} cho mỗi đáp án.
        </div>
      ) : null}
      {item.group_title && <div style={{ marginTop: "8px", fontWeight: 600 }}>{item.group_title}</div>}
      {item.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image_url} alt="Hình của nhóm câu hỏi" style={{ maxWidth: "100%", marginTop: "10px", borderRadius: "8px" }} />
      )}
    </div>
  );
}
