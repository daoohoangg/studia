/** Web không có thông báo đẩy: bản rỗng để bundle web không nạp expo-notifications. */
import Constants from "expo-constants";

const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
export const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || fromConfig || "";
export const CHANNEL_ID = "friends";

export type PushStatus = "unsupported" | "needs-setup" | "denied" | "ask" | "off" | "on";

export function pushSupported(): { ok: boolean; reason?: "unsupported" | "needs-setup" } {
  return { ok: false, reason: "unsupported" };
}

export async function pushStatus(): Promise<PushStatus> {
  return "unsupported";
}

export async function enablePush(): Promise<PushStatus> {
  return "unsupported";
}

export async function disablePush(): Promise<void> {}

export async function unregisterDevice(): Promise<void> {}

export async function syncPush(): Promise<void> {}

export const promptDismissed = async () => true;
export const dismissPrompt = async () => {};

export function routeFor(_data: unknown): string | null {
  return null;
}
