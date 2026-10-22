import type { Metadata } from "next";
import Link from "next/link";
import Mascot from "@/components/mascot/Mascot";
import { POSTS, fmtDate } from "@/lib/blog";
import BlogShell from "./BlogShell";

export const metadata: Metadata = {
  title: "Blog của Coal | Studia",
  description: "Cách học IELTS hiệu quả, tài liệu nên học, lộ trình 12 tuần và câu chuyện của Coal, cục than nhỏ muốn thành kim cương, người bạn AI của Studia.",
  openGraph: { title: "Blog của Coal | Studia", description: "Học thông minh, giữ lửa mỗi ngày cùng Coal.", type: "website" },
};

export default function BlogIndex() {
  const [featured, ...rest] = POSTS;
  return (
    <BlogShell current="blog">
      <div className="bl-wrap">
        <section className="bl-hero" aria-labelledby="bl-h1">
          <div>
            <span className="bl-eyebrow">Blog của Coal</span>
            <h1 id="bl-h1" className="bl-h1">Học thông minh, giữ lửa mỗi ngày</h1>
            <p className="bl-lead">Cách học hiệu quả, tài liệu đáng học, lộ trình rõ ràng, và câu chuyện của Coal, cục than nhỏ muốn thành kim cương, người bạn AI học cùng bạn trong Studia.</p>
          </div>
          <div className="bl-hero-coal"><Mascot mood="hello" size={190} /></div>
        </section>

        <Link href={`/blog/${featured.slug}`} className="bl-feature" aria-label={`Bài nổi bật: ${featured.title}`}>
          <div>
            <span className="bl-tag">{featured.tag}</span>
            <h2>{featured.title}</h2>
            <p>{featured.excerpt}</p>
            <p className="bl-meta" style={{ marginTop: 14 }}>{fmtDate(featured.date)} · {featured.readMin} phút đọc</p>
          </div>
          <div className="bl-feature-coal"><Mascot mood={featured.coal.mood} fire={featured.coal.fire} wet={featured.coal.wet} size={210} label="" /></div>
        </Link>

        <section className="bl-grid" aria-label="Các bài viết">
          {rest.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="bl-card">
              <div className="bl-card-top"><Mascot mood={p.coal.mood} fire={p.coal.fire} wet={p.coal.wet} size={120} label="" /></div>
              <span className="bl-tag">{p.tag}</span>
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <span className="bl-meta">{fmtDate(p.date)} · {p.readMin} phút đọc</span>
            </Link>
          ))}
        </section>
      </div>
    </BlogShell>
  );
}
