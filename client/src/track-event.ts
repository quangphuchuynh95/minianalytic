export interface EventData {
  user?: string;
  type: "page_load" | "enter";
  page: string;
}

export function event(data: EventData) {
  if (import.meta.env.VITE_TRACKER_API_URL) {
    fetch(import.meta.env.VITE_TRACKER_API_URL, {
      method: "POST",
      body: [data.user ?? "", data.type ?? "", data.page].join("\n"),
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
