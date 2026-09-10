export type AnalyticEventType =
  | "page_load"
  | "enter"
  | "add_to_cart"
  | "remove_from_cart"
  | "initiate_checkout"
  | "payment_result"
  | "click_banner"
  | "claim_voucher"
  | "apply_voucher"
  | "spin_wheel"
  | "select_addon";

export interface EventData<T = Record<string, unknown>> {
  user?: string;
  type: AnalyticEventType | (string & {});
  page: string;
  payload?: T;
}

let currentUserId = "";

const UTM_STORAGE_KEY = "ma_utm";
const UTM_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export interface UtmData {
  utm_source?: string | undefined;
  utm_medium?: string | undefined;
  utm_campaign?: string | undefined;
  timestamp: number;
}

let cachedUtm: UtmData | null = null;

export function getUtmSource(): string {
  if (typeof window === "undefined") return "direct";

  try {
    // 1. Check URL query parameters first (Last-touch)
    const searchParams = new URLSearchParams(window.location.search);
    const sourceParam =
      searchParams.get("utm_source") ||
      searchParams.get("source") ||
      searchParams.get("utm_campaign");

    if (sourceParam) {
      const utmData: UtmData = {
        utm_source: sourceParam.toLowerCase().trim(),
        utm_medium: searchParams.get("utm_medium")?.toLowerCase().trim(),
        utm_campaign: searchParams.get("utm_campaign")?.toLowerCase().trim(),
        timestamp: Date.now(),
      };
      cachedUtm = utmData;
      try {
        sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));
      } catch {
        // Ignore sessionStorage restrictions
      }
      return utmData.utm_source ?? "direct";
    }

    // 2. Check in-memory cache
    if (cachedUtm && Date.now() - cachedUtm.timestamp < UTM_TIMEOUT && cachedUtm.utm_source) {
      return cachedUtm.utm_source;
    }

    // 3. Check sessionStorage
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as UtmData;
      if (parsed && Date.now() - parsed.timestamp < UTM_TIMEOUT && parsed.utm_source) {
        cachedUtm = parsed;
        return parsed.utm_source;
      }
    }
  } catch {
    // Fallback safely on error
  }

  return "direct";
}

export function setAnalyticsUser(user: string | undefined): void {
  currentUserId = user ?? "";
}

export function getAnalyticsUser(): string {
  return currentUserId;
}

export function event<T = Record<string, unknown>>(data: EventData<T>) {
  if (import.meta.env.VITE_TRACKER_API_URL) {
    const utmSource = getUtmSource();
    const payloadObj =
      typeof data.payload === "object" && data.payload !== null
        ? { ...data.payload }
        : {};

    // Auto-attach utm_source if not explicitly set
    if (!("utm_source" in payloadObj)) {
      Object.assign(payloadObj, { utm_source: utmSource });
    }

    const payloadStr = JSON.stringify(payloadObj);
    const user = data.user !== undefined ? data.user : currentUserId;
    fetch(import.meta.env.VITE_TRACKER_API_URL, {
      method: "POST",
      body: [user, data.type ?? "", data.page, payloadStr].join("\n"),
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      keepalive: true, // cheap insurance, optional here
      priority: "low", // Chromium: deprioritize vs. app requests
    }).catch((err) => {
      console.warn(err);
    });
  } else {
    console.warn("Missing config env VITE_TRACKER_API_URL");
  }
}

