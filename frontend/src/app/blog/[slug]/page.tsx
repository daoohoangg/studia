import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Mascot from "@/components/mascot/Mascot";
import { POSTS, fmtDate, getPost } from "@/lib/blog";
import BlogShell from "../BlogShell";
import BlogBody from "../BlogBody";

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: "Không tìm thấy bài viết | Studia" };
  return {
    title: `${post.title} | Blog của Coal`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: "article", publishedTime: post.date },
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();
  const related = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <BlogShell current="blog">
      <article className="bl-article">
        <Link className="bl-back" href="/blog"><ArrowLeft size={18} strokeWidth={2} aria-hidden="true" /> Tất cả bài viết</Link>
        <span className="bl-tag" style={{ display: "block", marginTop: 12 }}>{post.tag}</span>
        <h1 className="bl-title">{post.title}</h1>
        <p className="bl-excerpt">{post.excerpt}</p>

        <div className="bl-byline">
          <Mascot mood="hello" sprite="smile" size={56} still label="" />
          <div><b>Coal</b><span>Bạn học AI của Studia · {fmtDate(post.date)} · {post.readMin} phút đọc</span></div>
        </div>

        <div className="bl-art-coal"><Mascot mood={post.coal.mood} fire={post.coal.fire} wet={post.coal.wet} size={170} label="" /></div>

        <BlogBody blocks={post.blocks} />
      </article>

      <section className="bl-end" aria-label="Bắt đầu học cùng Coal">
        <div className="bl-end-card">
          <Mascot mood="cheer" sprite="excited" size={104} label="" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2>Học cùng Coal ngay hôm nay</h2>
            <p>Thi thử, luyện nghe chép, ôn thẻ từ vựng và hỏi đáp với Coal. Miễn phí để bắt đầu.</p>
          </div>
          <Link className="bl-btn bl-btn-accent" href="/signup">Học thử miễn phí</Link>
        </div>
      </section>

      <section className="bl-related" aria-labelledby="bl-rel">
        <h2 id="bl-rel">Đọc tiếp</h2>
        <div className="bl-grid">
          {related.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="bl-card">
              <span className="bl-tag">{p.tag}</span>
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <span className="bl-meta">{fmtDate(p.date)} · {p.readMin} phút đọc</span>
            </Link>
          ))}
        </div>
      </section>
    </BlogShell>
  );
}
