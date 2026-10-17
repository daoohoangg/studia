"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { API } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { formatVnd } from "@/lib/account";

type Pack = { id: string; name: string; books: number; price_vnd: number; description?: string | null; highlight?: boolean };
type Upcoming = { name: string; books: number; description?: string | null; highlight?: boolean };
type Data = { packs: Pack[]; upcoming: Upcoming[]; free_books: number };

export const PICK_KEY = "studia-pick-pack";

/** Bảng giá thật lấy từ quản trị: chọn một gói rồi tiếp tục (đăng nhập xong sẽ về đúng trang thanh toán). */
export default function Pricing() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const ctl = new AbortController();
    fetch(`${API}/billing/public-packs`, { signal: ctl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const d = (await r.json()) as Data;
        setData(d);
        setPicked((cur) => cur ?? d.packs.find((p) => p.highlight)?.id ?? d.packs[0]?.id ?? null);
      })
      .catch((e) => { if (e?.name !== "AbortError") setFailed(true); });
    return () => ctl.abort();
  }, []);

  const free = data?.free_books ?? 1;
  const chosen = data?.packs.find((p) => p.id === picked) || null;

  const proceed = async () => {
    if (!chosen) return;
    try { sessionStorage.setItem(PICK_KEY, chosen.id); } catch {}
    const { data: s } = await supabase.auth.getSession();
    router.push(s.session ? `/billing?pack=${chosen.id}` : "/signup");
  };

  const freeCard = (
    <div className="lp-plan">
      <h3>Dùng thử</h3>
      <div className="big">0 đ</div>
      <p style={{ color: "var(--ink-muted)" }}>Đủ để làm quen với Studia</p>
      <ul className="lp-list">
        <li><span><b>{free} cuốn sách</b> tải lên miễn phí</span></li>
        <li><span>Học trọn Thư viện Studia, thi thử và Studia AI</span></li>
        <li><span>Lịch học, streak và nhắc giờ học qua email</span></li>
      </ul>
      <Link className="lp-btn lp-btn-ghost" style={{ marginTop: 28, width: "100%" }} href="/signup">Tạo tài khoản</Link>
    </div>
  );

  if (!data && !failed) {
    return (
      <div className="lp-price multi" aria-busy="true" aria-label="Đang tải bảng giá">
        {[0, 1, 2, 3].map((i) => <div key={i} className="lp-plan lp-plan-skel" aria-hidden="true" />)}
      </div>
    );
  }

  if (failed || (!data!.packs.length && !data!.upcoming.length)) {
    return (
      <div className="lp-price">
        {freeCard}
        <div className="lp-plan hot">
          <h3>Mua thêm lượt</h3><div className="big">Theo gói</div>
          <p>Chưa tải được bảng giá. Bạn có thể xem giá ngay sau khi đăng nhập.</p>
          <ul className="lp-list"><li><span><b>Thêm lượt</b> khi muốn tải thêm sách</span></li><li><span>Chuyển khoản VietQR, lượt cộng ngay khi nhận tiền</span></li></ul>
          <Link className="lp-btn lp-btn-accent" style={{ marginTop: 28, width: "100%" }} href="/signup">Bắt đầu</Link>
        </div>
      </div>
    );
  }

  const onSale = data!.packs.length > 0;
  return (
    <>
      <div className="lp-price multi" role={onSale ? "radiogroup" : undefined} aria-label="Chọn gói lượt upload">
        {freeCard}
        {onSale ? data!.packs.map((p) => {
          const on = p.id === picked;
          return (
            <button key={p.id} type="button" role="radio" aria-checked={on} className={`lp-plan lp-pick${p.highlight ? " hot" : ""}${on ? " on" : ""}`} onClick={() => setPicked(p.id)}>
              {p.highlight && <span className="lp-flag">Chọn nhiều nhất</span>}
              <h3>{p.name}</h3>
              <div className="big">{formatVnd(p.price_vnd)}</div>
              <p className="lp-pack-n"><b>+{p.books} sách</b> · khoảng {formatVnd(Math.round(p.price_vnd / p.books))}/sách</p>
              {p.description && <p className="lp-pack-d">{p.description}</p>}
              <span className="lp-radio" aria-hidden="true">{on && <Check size={15} strokeWidth={3.4} />}</span>
            </button>
          );
        }) : data!.upcoming.map((p) => (
          <div key={p.name} className="lp-plan lp-soon">
            <h3>{p.name}</h3>
            <div className="big">+{p.books} sách</div>
            <p style={{ color: "var(--ink-muted)" }}>{p.description || "Sắp mở bán"}</p>
            <span className="lp-soon-tag">Sắp mở bán</span>
          </div>
        ))}
      </div>

      {onSale && chosen && (
        <div className="lp-pick-bar" role="status">
          <div>
            <b>{chosen.name}: +{chosen.books} sách</b>
            <span>{formatVnd(chosen.price_vnd)} · thanh toán chuyển khoản VietQR, lượt cộng tự động khi tiền về</span>
          </div>
          <button type="button" className="lp-btn lp-btn-accent" onClick={proceed}>Tiếp tục với {chosen.name}</button>
        </div>
      )}
      {!onSale && <p className="lp-soon-note">Các gói mua thêm đang được chuẩn bị. Bạn vẫn dùng thử miễn phí ngay bây giờ.</p>}
    </>
  );
}
