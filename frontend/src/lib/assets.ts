/**
 * Đường dẫn tài nguyên tĩnh lớn (audio Listening). Khi deploy, đặt NEXT_PUBLIC_AUDIO_BASE_URL trỏ tới
 * storage công khai (vd. https://<ref>.supabase.co/storage/v1/object/public/audio); để trống khi chạy máy.
 */
const AUDIO_BASE = (process.env.NEXT_PUBLIC_AUDIO_BASE_URL || "").replace(/\/+$/, "");

export function audioUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path) || !AUDIO_BASE) return path;
  return `${AUDIO_BASE}/${path.replace(/^\/?audio\//, "")}`;
}
