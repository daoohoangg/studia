import * as Linking from "expo-linking";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { AuthShell } from "@/components/AuthShell";
import { Banner, Button, LoadingView, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { completeOAuthUrl } from "@/lib/googleAuth";
import { hasAuthPayload, parseAuthUrl } from "@/lib/oauthUrl";

// Android có thể đưa app tới địa chỉ này sau khi đăng nhập Google; web dùng nó để đóng cửa sổ đăng nhập.
WebBrowser.maybeCompleteAuthSession();

function buildParamUrl(params: Record<string, string | string[] | undefined>): string | null {
  const entries = Object.entries(params)
    .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v] as const)
    .filter((pair): pair is [string, string] => typeof pair[1] === "string" && pair[1].length > 0);
  if (!entries.length) return null;
  const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return `studia://auth-callback?${qs}`;
}

/** Trang trung gian: phân tích code/token từ deep link nếu cold-start hoặc mở từ ngoài app, rồi chuyển vào trang chủ. */
export default function AuthCallback() {
  const { session } = useAuth();
  const linkingUrl = Linking.useLinkingURL();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const handled = useRef<string | null>(null);

  const paramUrl = useMemo(() => buildParamUrl(params), [params]);

  useEffect(() => {
    if (session) return;
    let alive = true;
    (async () => {
      const webUrl = Platform.OS === "web" && typeof window !== "undefined" ? window.location.href : null;
      const candidates = [linkingUrl, webUrl, paramUrl, await Linking.getInitialURL()];
      const target = candidates.find((u): u is string => !!u && hasAuthPayload(parseAuthUrl(u))) ?? null;
      if (!alive) return;
      if (!target) {
        setDone(true);
        return;
      }
      if (handled.current === target) return;
      handled.current = target;
      const res = await completeOAuthUrl(target);
      if (!alive) return;
      if (res.ok) setDone(true);
      else setError(res.message || "Đăng nhập bằng Google không thành công. Thử lại nhé.");
    })();
    return () => { alive = false; };
  }, [session, linkingUrl, paramUrl]);

  if (session || done) return <Redirect href="/" />;
  if (error) {
    return (
      <AuthShell title="Đăng nhập không thành công" sprite="sad">
        <Banner text={error} />
        <Button title="Về trang đăng nhập" onPress={() => router.replace("/sign-in")} />
      </AuthShell>
    );
  }
  return (
    <Screen scroll={false}>
      <LoadingView text="Đang hoàn tất đăng nhập…" />
    </Screen>
  );
}
