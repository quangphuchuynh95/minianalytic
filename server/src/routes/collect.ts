import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Context } from "hono";
import { getConnInfo } from "hono/bun";
import { getCookie, setCookie } from "hono/cookie";
import { InMemoryStore } from "~services/in-memory-store";
import { appFactory } from "../app.factory";

export interface PostData {
  user?: string;
  type: string;
  page: string;
  payload?: string;
}

export interface ProcessedData extends PostData {
  session: string;
  ip: string;
  userAgent: string;
  time: Date;
}

const SESSION_COOKIE = "ma_sid";
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

const sessionStore = new InMemoryStore();

export const collect = appFactory.createHandlers(async (c) => {
  const raw = await c.req.text();

  let session = getSessionId(c);

  const data: ProcessedData = {
    ...processTextData(raw),
    time: new Date(),
    session,
    ip: getClientIp(c),
    userAgent: c.req.header("user-agent") ?? "",
  };

  await appendTsv(data);

  return c.text("OK");
});

async function appendTsv(data: ProcessedData): Promise<void> {
  // time, session, user, ip, userAgent, type, page, payload
  const sanitizedPayload = (data.payload || "{}")
    .replaceAll("\t", " ")
    .replaceAll("\n", " ");

  const row = [
    data.time.getTime().toString(),
    data.session,
    data.user ?? "",
    data.ip,
    data.userAgent,
    data.type,
    data.page,
    sanitizedPayload,
  ]
    .map((v) => v.replaceAll("\t", " ").replaceAll("\n", " "))
    .join("\t");

  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dir = join(import.meta.dirname, "../../storage/v0");
  await mkdir(dir, { recursive: true });
  await appendFile(join(dir, `${day}.v0.tsv`), row + "\n");
}

function getSessionId(c: Context): string {
  let session = getCookie(c, SESSION_COOKIE);

  if (!session || !sessionStore.has(session)) {
    session = crypto.randomUUID();
  }

  // Refresh TTL on every request
  sessionStore.set(session, true, SESSION_TTL);

  setCookie(c, SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "Lax",
    maxAge: SESSION_TTL / 1000,
    path: "/",
  });

  return session;
}

function getClientIp(c: Context): string {
  // X-Forwarded-For can contain a comma-separated list; the first entry is the original client
  const xff = c.req.header("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  // Cloudflare
  const cfIp = c.req.header("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Common reverse-proxy headers
  const realIp = c.req.header("x-real-ip");
  if (realIp) return realIp;

  // Direct connection (Bun) — read from socket via Hono's getConnInfo
  const addr = getConnInfo(c).remote.address;
  if (addr) return addr;

  return "";
}

function processTextData(data: string): PostData {
  const lines = data.split("\n");
  const user = lines[0] ?? "";
  const type = lines[1] ?? "";
  const page = lines[2] ?? "";
  const rawPayload = lines.slice(3).join("\n").trim();
  return {
    user,
    type,
    page,
    payload: rawPayload || "{}",
  };
}
