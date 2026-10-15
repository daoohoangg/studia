import { supabase } from "@/lib/supabase";

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/** fetch tới backend Studia, tự gắn access token Supabase của phiên hiện tại. */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  const token = data.session?.access_token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = input.startsWith("http") ? input : `${API}${input}`;
  return fetch(url, { ...init, headers });
}
