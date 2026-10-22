import { Fragment } from "react";
import Mascot from "@/components/mascot/Mascot";
import type { Block } from "@/lib/blog";

/** **in đậm** trong đoạn văn. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

export default function BlogBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="bl-body">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p": return <p key={i}><Rich text={b.text} /></p>;
          case "h2": return <h2 key={i}>{b.text}</h2>;
          case "h3": return <h3 key={i}>{b.text}</h3>;
          case "ul": return <ul key={i}>{b.items.map((x, j) => <li key={j}><Rich text={x} /></li>)}</ul>;
          case "ol": return <ol key={i}>{b.items.map((x, j) => <li key={j}><Rich text={x} /></li>)}</ol>;
          case "quote": return <blockquote key={i}><Rich text={b.text} />{b.cite && <cite>{b.cite}</cite>}</blockquote>;
          case "callout": return <aside key={i} className="bl-callout" data-tone={b.tone ?? "brand"}><b>{b.title}</b><Rich text={b.text} /></aside>;
          case "table":
            return (
              <div key={i} className="bl-table-wrap">
                <table className="bl-table">
                  <thead><tr>{b.head.map((h, j) => <th key={j} scope="col">{h}</th>)}</tr></thead>
                  <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}><Rich text={c} /></td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          case "coal":
            return (
              <div key={i} className="bl-says" role="note" aria-label="Coal nói">
                <Mascot mood={b.mood} wet={b.wet} fire={b.fire} size={96} label="" />
                <p><Rich text={b.text} /></p>
              </div>
            );
        }
      })}
    </div>
  );
}
