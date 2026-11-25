import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { errorMessage } from "./api";
import { disablePush, enablePush, pushStatus, type PushStatus } from "./push";

/** Trạng thái push dùng chung giữa Cài đặt và tab Bạn bè để luôn đồng bộ. */
let sharedStatus: PushStatus | null = null;
const listeners = new Set<() => void>();

function setSharedStatus(next: PushStatus) {
  if (sharedStatus === next) return;
  sharedStatus = next;
  listeners.forEach((l) => l());
}

/** Trạng thái và thao tác bật/tắt thông báo đẩy cho màn hình Cài đặt và thẻ mời ở tab Bạn bè. */
export function usePush() {
  const status = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sharedStatus,
    () => sharedStatus,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    pushStatus().then(setSharedStatus).catch(() => setSharedStatus("unsupported"));
  }, []);

  useEffect(() => {
    refresh();
    // Quay lại app sau khi bật quyền trong Cài đặt của điện thoại thì cập nhật ngay
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") refresh(); });
    return () => sub.remove();
  }, [refresh]);

  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  const enable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setSharedStatus(await enablePush());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const disable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await disablePush();
      setSharedStatus("off");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return { status, busy, error, enable, disable, refresh };
}
