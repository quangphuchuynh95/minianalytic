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

export function setAnalyticsUser(user: string | undefined): void {
  currentUserId = user ?? "";
}

export function getAnalyticsUser(): string {
  return currentUserId;
}

export function event<T = Record<string, unknown>>(data: EventData<T>) {
  if (import.meta.env.VITE_TRACKER_API_URL) {
    const payloadStr = data.payload ? JSON.stringify(data.payload) : "{}";
    const user = data.user !== undefined ? data.user : currentUserId;
    fetch(import.meta.env.VITE_TRACKER_API_URL, {
      method: "POST",
      body: [user, data.type ?? "", data.page, payloadStr].join("\n"),
      headers: { "Content-Type": "text/plain;charset=UTF-8" }, // avoid preflight
      mode: "no-cors", // if you don't need to read the response
      credentials: "omit", // skip cookies unless the server needs them
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

