import { supabase } from "@/lib/supabase";

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Các GET trùng nhau gọi cùng lúc (vd. nhiều khối cùng cần /account/me, hoặc React StrictMode chạy effect 2 lần) chỉ gửi 1 yêu cầu;
// kết quả được giữ vài giây để chuyển qua lại giữa các trang không phải chờ lại. Mọi yêu cầu ghi (POST/PUT/PATCH/DELETE) xoá toàn bộ bộ nhớ này.
const GET_TTL_MS = 8000;
// Những đường dẫn phải luôn tươi: tiến trình xử lý sách, trạng thái đơn thanh toán, phiên thi.
const NO_CACHE = /\/(documents|books|billing\/orders|exam|admin\/orders|export|speech|tts)(\/|\?|$)/;
const cache = new Map<string, { at: number; res: Promise<Response> }>();

let authBound = false;
function bindAuth() {
  if (authBound || typeof window === "undefined") return;
  authBound = true;
  supabase.auth.onAuthStateChange(() => cache.clear());
}

/** fetch tới backend Studia, tự gắn access token Supabase của phiên hiện tại. */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  bindAuth();
  const url = input.startsWith("http") ? input : `${API}${input}`;
  const method = (init.method || "GET").toUpperCase();

  const send = async () => {
    const { data } = await supabase.auth.getSession();
    const headers = new Headers(init.headers);
    const token = data.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    try {
      return await fetch(url, { ...init, headers });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      throw new Error("Không kết nối được máy chủ Studia. Kiểm tra mạng, hoặc backend đã chạy chưa.");
    }
  };

  if (method !== "GET") {
    cache.clear();
    return send();
  }
  if (init.signal || init.cache === "no-store" || NO_CACHE.test(url)) return send();

  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < GET_TTL_MS) return (await hit.res).clone();

  const res = send();
  cache.set(url, { at: Date.now(), res });
  res.then((r) => { if (!r.ok) cache.delete(url); }, () => cache.delete(url));
  return (await res).clone();
}
