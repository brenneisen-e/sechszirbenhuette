// Instagram-Kanal @sechszirbenhuette auf der Website.
//
// Weg: „Instagram API mit Instagram-Login“ (Meta). Malte legt dafür eine
// Meta-App an, trägt deren Instagram-App-ID und -Geheimnis im Admin Center ein
// (Tab Instagram) und verbindet das Konto per Anmeldung bei Instagram. Der
// Rücksprung landet auf /api/instagram/callback — außerhalb von /api/admin,
// weil der Browser beim Sprung von instagram.com das Admin-Cookie je nach
// Einstellung nicht mitschickt; geprüft wird stattdessen der Einmalwert
// (state), den nur das Admin Center erzeugen kann. Alternativ lässt sich ein
// im Meta-Dashboard erzeugter Zugangsschlüssel direkt einfügen.
//
// Geheimnis und Zugangsschlüssel liegen nur in der settings-Tabelle und
// verlassen den Server nie. Der Schlüssel gilt 60 Tage; er wird beim
// Abrufen des Feeds rechtzeitig verlängert. Der Feed (Profil und letzte
// Beiträge) wird zwischengespeichert, weil die Bildadressen von Instagram
// nach einigen Tagen ablaufen und Meta Abrufe begrenzt.

import { writeAppLog } from '@/lib/server/appLog';
import { getSetting, setSetting } from '@/lib/server/beds24';

const GRAPH = 'https://graph.instagram.com';
const OAUTH_AUTHORIZE = 'https://www.instagram.com/oauth/authorize';
const OAUTH_TOKEN = 'https://api.instagram.com/oauth/access_token';
export const INSTAGRAM_SCOPE = 'instagram_business_basic';

const KEYS = {
  appId: 'instagram_app_id',
  appSecret: 'instagram_app_secret',
  token: 'instagram_access_token',
  expiresAt: 'instagram_token_expires_at',
  refreshedAt: 'instagram_token_refreshed_at',
  userId: 'instagram_user_id',
  username: 'instagram_username',
  state: 'instagram_oauth_state',
  feed: 'instagram_feed_cache',
  lastError: 'instagram_last_error',
  lastAttempt: 'instagram_last_attempt',
  enabled: 'instagram_feed_enabled',
} as const;

/** Feed höchstens so alt, bevor neu bei Instagram geholt wird */
const FEED_MAX_AGE_MS = 60 * 60 * 1000;
/** Nach einem Fehlschlag frühestens so spät erneut bei Instagram fragen */
const RETRY_AFTER_MS = 15 * 60 * 1000;
/** Schlüssel verlängern, sobald er älter als das ist (gültig 60 Tage) */
const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const POST_LIMIT = 12;
const TIMEOUT_MS = 8000;

export interface InstagramPost {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  image: string;
  permalink: string;
  caption: string;
  timestamp: string;
}

export interface InstagramProfile {
  username: string;
  name?: string;
  picture?: string;
  followers?: number;
  mediaCount?: number;
}

export interface InstagramFeed {
  fetchedAt: string;
  profile: InstagramProfile | null;
  posts: InstagramPost[];
}

export interface InstagramStatus {
  appId: string;
  hasSecret: boolean;
  connected: boolean;
  username: string | null;
  expiresAt: string | null;
  enabled: boolean;
  lastError: string | null;
  feed: { fetchedAt: string; posts: number } | null;
}

async function deleteSetting(db: D1Database, key: string) {
  await db.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();
}

function withTimeout(init: RequestInit = {}): RequestInit {
  return { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) };
}

/** Fehlermeldung aus einer Antwort von Meta lesen */
function metaError(data: unknown, status: number): string {
  const d = data as {
    error?: { message?: string; error_user_msg?: string } | string;
    error_message?: string;
  };
  if (typeof d?.error === 'object' && d.error) {
    return d.error.error_user_msg || d.error.message || `Fehler ${status}`;
  }
  if (typeof d?.error_message === 'string') return d.error_message;
  if (typeof d?.error === 'string') return d.error;
  return `Instagram antwortet mit Status ${status}`;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error_message: text.slice(0, 200) || '(leere Antwort)' };
  }
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Eine einzige Weiterleitungsadresse für die Meta-App, egal ob das Admin
// Center mit oder ohne www geöffnet wird; nur lokal zählt die eigene Adresse
const CANONICAL_ORIGIN = 'https://sechszirbenhuette.com';

export function redirectUriFor(origin: string): string {
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return `${local ? origin : CANONICAL_ORIGIN}/api/instagram/callback`;
}

// ============================================================================
// Status und Einstellungen (Admin Center)
// ============================================================================

export async function getInstagramStatus(db: D1Database): Promise<InstagramStatus> {
  const [appId, secret, token, username, expiresAt, enabled, lastError, feedRaw] =
    await Promise.all([
      getSetting(db, KEYS.appId),
      getSetting(db, KEYS.appSecret),
      getSetting(db, KEYS.token),
      getSetting(db, KEYS.username),
      getSetting(db, KEYS.expiresAt),
      getSetting(db, KEYS.enabled),
      getSetting(db, KEYS.lastError),
      getSetting(db, KEYS.feed),
    ]);
  const feed = parseFeed(feedRaw);
  return {
    appId: appId ?? '',
    hasSecret: !!secret,
    connected: !!token,
    username,
    expiresAt,
    enabled: enabled !== '0',
    lastError,
    feed: feed ? { fetchedAt: feed.fetchedAt, posts: feed.posts.length } : null,
  };
}

export async function saveAppCredentials(db: D1Database, appId: string, appSecret?: string) {
  const id = appId.trim();
  if (!/^\d{5,25}$/.test(id)) throw new Error('Die Instagram-App-ID besteht nur aus Ziffern');
  await setSetting(db, KEYS.appId, id);
  const secret = appSecret?.trim();
  if (secret) {
    if (!/^[A-Za-z0-9]{16,64}$/.test(secret)) {
      throw new Error('Das App-Geheimnis sieht nicht richtig aus (Buchstaben und Ziffern)');
    }
    await setSetting(db, KEYS.appSecret, secret);
  }
}

export async function setFeedEnabled(db: D1Database, enabled: boolean) {
  await setSetting(db, KEYS.enabled, enabled ? '1' : '0');
}

export async function disconnectInstagram(db: D1Database) {
  for (const key of [
    KEYS.token,
    KEYS.expiresAt,
    KEYS.refreshedAt,
    KEYS.userId,
    KEYS.username,
    KEYS.feed,
    KEYS.lastError,
    KEYS.lastAttempt,
    KEYS.state,
  ]) {
    await deleteSetting(db, key);
  }
}

// ============================================================================
// Anmeldung bei Instagram
// ============================================================================

/** Adresse der Instagram-Anmeldung; der Einmalwert gilt 15 Minuten */
export async function createAuthorizeUrl(db: D1Database, origin: string): Promise<string> {
  const appId = await getSetting(db, KEYS.appId);
  const secret = await getSetting(db, KEYS.appSecret);
  if (!appId || !secret) throw new Error('Erst Instagram-App-ID und App-Geheimnis speichern');
  const state = randomState();
  // Genau diese Adresse muss beim Tausch des Codes wieder mitgeschickt werden
  const redirectUri = redirectUriFor(origin);
  await setSetting(
    db,
    KEYS.state,
    JSON.stringify({ state, expiresAt: Date.now() + 15 * 60 * 1000, origin, redirectUri }),
  );
  const params = new URLSearchParams({
    enable_fb_login: '0',
    force_reauth: 'true',
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: INSTAGRAM_SCOPE,
    state,
  });
  await writeAppLog(
    db,
    'info',
    'instagram',
    'authorize',
    'Anmeldung bei Instagram gestartet',
    JSON.stringify({ origin, redirectUri, appId }),
  );
  return `${OAUTH_AUTHORIZE}?${params.toString()}`;
}

/**
 * Einmalwert prüfen und verbrauchen; liefert die Herkunft der Anmeldung und
 * die beim Start verwendete Weiterleitungsadresse
 */
async function consumeState(
  db: D1Database,
  state: string,
): Promise<{ origin: string; redirectUri?: string } | null> {
  // Lesen und Löschen in einem Schritt: kommt der Rücksprung doppelt an,
  // bekommt nur eine Anfrage den Einmalwert
  const row = await db
    .prepare('DELETE FROM settings WHERE key = ? RETURNING value')
    .bind(KEYS.state)
    .first<{ value: string }>();
  const raw = row?.value ?? null;
  if (!raw || !state) return null;
  try {
    const saved = JSON.parse(raw) as {
      state?: string;
      expiresAt?: number;
      origin?: string;
      redirectUri?: string;
    };
    if (saved.state !== state || !saved.expiresAt || saved.expiresAt < Date.now()) return null;
    return saved.origin ? { origin: saved.origin, redirectUri: saved.redirectUri } : null;
  } catch {
    return null;
  }
}

async function storeToken(db: D1Database, token: string, expiresInSeconds: number | undefined) {
  const seconds = expiresInSeconds && expiresInSeconds > 0 ? expiresInSeconds : 60 * 24 * 60 * 60;
  await setSetting(db, KEYS.token, token);
  await setSetting(db, KEYS.expiresAt, new Date(Date.now() + seconds * 1000).toISOString());
  await setSetting(db, KEYS.refreshedAt, new Date().toISOString());
}

/** Kurzlebigen Schlüssel (1 Stunde) gegen einen für 60 Tage tauschen */
async function exchangeLongLived(
  token: string,
  secret: string,
): Promise<{ token: string; expiresIn?: number }> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: secret,
    access_token: token,
  });
  const res = await fetch(`${GRAPH}/access_token?${params.toString()}`, withTimeout());
  const data = (await readJson(res)) as { access_token?: string; expires_in?: number };
  if (!res.ok || !data.access_token) throw new Error(metaError(data, res.status));
  return { token: data.access_token, expiresIn: data.expires_in };
}

/** Einmalwert fehlt, ist abgelaufen oder schon verbraucht */
export class InstagramStateError extends Error {}

/** Mit diesem Code wurde gerade erst verbunden (doppelter Rücksprung)? */
export async function recentlyConnected(db: D1Database): Promise<string | null> {
  const [token, refreshedAt, username] = await Promise.all([
    getSetting(db, KEYS.token),
    getSetting(db, KEYS.refreshedAt),
    getSetting(db, KEYS.username),
  ]);
  const age = Date.now() - Date.parse(refreshedAt ?? '');
  return token && username && age >= 0 && age < 2 * 60 * 1000 ? username : null;
}

/**
 * Adressen für den Code-Tausch: zuerst die, unter der der Rücksprung ankam,
 * dann die beim Start gespeicherte; jeweils auch mit/ohne Schrägstrich am Ende,
 * falls Meta die eingetragene Adresse anders schreibt
 */
function redirectCandidates(uris: (string | undefined)[]): string[] {
  const list: string[] = [];
  const add = (u: string) => {
    if (!list.includes(u)) list.push(u);
  };
  const base = uris.filter((u): u is string => !!u);
  base.forEach(add);
  base.forEach((u) => add(u.endsWith('/') ? u.slice(0, -1) : `${u}/`));
  return list.slice(0, 5);
}

async function exchangeCode(
  appId: string,
  secret: string,
  code: string,
  redirectUri: string,
): Promise<{ token?: string; status: number; error?: string }> {
  const form = new URLSearchParams({
    client_id: appId,
    client_secret: secret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(
    OAUTH_TOKEN,
    withTimeout({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    }),
  );
  const data = (await readJson(res)) as {
    access_token?: string;
    data?: { access_token?: string }[];
  };
  const token = data.access_token ?? data.data?.[0]?.access_token;
  return res.ok && token
    ? { token, status: res.status }
    : { status: res.status, error: metaError(data, res.status) };
}

/** Rücksprung von Instagram: Code gegen Schlüssel tauschen und Profil lesen */
export async function completeAuthorization(
  db: D1Database,
  code: string,
  state: string,
  calledAt?: string,
): Promise<{ username: string; origin: string }> {
  const saved = await consumeState(db, state);
  if (!saved) {
    await writeAppLog(
      db,
      'warn',
      'instagram',
      'connect',
      'Rücksprung ohne gültigen Einmalwert',
      JSON.stringify({ calledAt }),
    );
    throw new InstagramStateError(
      'Anmeldung abgelaufen oder ungültig — bitte im Admin Center neu starten',
    );
  }
  const { origin } = saved;
  const appId = await getSetting(db, KEYS.appId);
  const secret = await getSetting(db, KEYS.appSecret);
  if (!appId || !secret) throw new Error('Instagram-App-ID oder App-Geheimnis fehlt');

  // Instagram verlangt beim Tausch exakt die Adresse aus dem Anmeldedialog.
  // Weitere Versuche nur, solange Instagram genau das bemängelt.
  const cleanCode = code.replace(/#_$/, '');
  const attempts: { redirectUri: string; status: number; error?: string }[] = [];
  let shortToken: string | undefined;
  for (const uri of redirectCandidates([calledAt, saved.redirectUri, redirectUriFor(origin)])) {
    const result = await exchangeCode(appId, secret, cleanCode, uri);
    attempts.push({ redirectUri: uri, status: result.status, error: result.error });
    if (result.token) {
      shortToken = result.token;
      break;
    }
    if (!/redirect_uri/i.test(result.error ?? '')) break;
  }
  await writeAppLog(
    db,
    shortToken ? 'info' : 'error',
    'instagram',
    'connect',
    shortToken ? 'Code gegen Schlüssel getauscht' : 'Code-Tausch abgelehnt',
    JSON.stringify({
      calledAt,
      storedRedirectUri: saved.redirectUri,
      origin,
      appId,
      codeLength: cleanCode.length,
      attempts,
    }),
  );
  if (!shortToken) throw new Error(attempts.at(-1)?.error ?? 'Code-Tausch fehlgeschlagen');

  const long = await exchangeLongLived(shortToken, secret);
  const profile = await fetchProfile(long.token);
  await storeToken(db, long.token, long.expiresIn);
  await saveProfileSettings(db, profile);
  await deleteSetting(db, KEYS.lastError);
  await deleteSetting(db, KEYS.feed);
  // Herkunft des Admin Centers (mit oder ohne www), dorthin geht es zurück
  return { username: profile.username, origin };
}

/** Zugangsschlüssel aus dem Meta-Dashboard übernehmen (gilt dort 60 Tage) */
export async function connectWithToken(
  db: D1Database,
  token: string,
): Promise<{ username: string }> {
  const value = token.trim();
  if (value.length < 40 || /\s/.test(value))
    throw new Error('Der Zugangsschlüssel ist unvollständig');
  let finalToken = value;
  let expiresIn: number | undefined;
  // Ein kurzlebiger Schlüssel lässt sich mit dem App-Geheimnis verlängern;
  // ein langlebiger aus dem Dashboard bleibt, wie er ist
  const secret = await getSetting(db, KEYS.appSecret);
  if (secret) {
    try {
      const long = await exchangeLongLived(value, secret);
      finalToken = long.token;
      expiresIn = long.expiresIn;
    } catch {
      // schon langlebig — weiter mit dem eingefügten Schlüssel
    }
  }
  const profile = await fetchProfile(finalToken);
  await storeToken(db, finalToken, expiresIn);
  await saveProfileSettings(db, profile);
  await deleteSetting(db, KEYS.lastError);
  await deleteSetting(db, KEYS.feed);
  return { username: profile.username };
}

async function saveProfileSettings(db: D1Database, profile: InstagramProfile & { id?: string }) {
  await setSetting(db, KEYS.username, profile.username);
  if (profile.id) await setSetting(db, KEYS.userId, profile.id);
}

// ============================================================================
// Feed
// ============================================================================

async function fetchProfile(token: string): Promise<InstagramProfile & { id?: string }> {
  const params = new URLSearchParams({
    fields: 'user_id,username,name,profile_picture_url,followers_count,media_count',
    access_token: token,
  });
  const res = await fetch(`${GRAPH}/me?${params.toString()}`, withTimeout());
  const data = (await readJson(res)) as {
    user_id?: string | number;
    id?: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
    media_count?: number;
  };
  if (!res.ok || !data.username) throw new Error(metaError(data, res.status));
  return {
    id: String(data.user_id ?? data.id ?? ''),
    username: data.username,
    name: data.name,
    picture: data.profile_picture_url,
    followers: data.followers_count,
    mediaCount: data.media_count,
  };
}

async function fetchPosts(token: string): Promise<InstagramPost[]> {
  const params = new URLSearchParams({
    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
    limit: String(POST_LIMIT),
    access_token: token,
  });
  const res = await fetch(`${GRAPH}/me/media?${params.toString()}`, withTimeout());
  const data = (await readJson(res)) as {
    data?: {
      id?: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      timestamp?: string;
    }[];
  };
  if (!res.ok || !Array.isArray(data.data)) throw new Error(metaError(data, res.status));
  const posts: InstagramPost[] = [];
  for (const m of data.data) {
    const type =
      m.media_type === 'VIDEO' || m.media_type === 'CAROUSEL_ALBUM' ? m.media_type : 'IMAGE';
    // Bei Videos das Vorschaubild; Reels mit lizenzierter Musik haben teils
    // keine media_url
    const image = type === 'VIDEO' ? m.thumbnail_url || '' : m.media_url || m.thumbnail_url || '';
    if (!m.id || !image || !m.permalink) continue;
    posts.push({
      id: m.id,
      type,
      image,
      permalink: m.permalink,
      caption: (m.caption ?? '').slice(0, 300),
      timestamp: m.timestamp ?? '',
    });
  }
  return posts;
}

/** Schlüssel verlängern, wenn er älter als eine Woche ist */
async function refreshTokenIfDue(db: D1Database, token: string): Promise<string> {
  const refreshedAt = Date.parse((await getSetting(db, KEYS.refreshedAt)) ?? '');
  if (Number.isFinite(refreshedAt) && Date.now() - refreshedAt < REFRESH_AFTER_MS) return token;
  const params = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token });
  const res = await fetch(`${GRAPH}/refresh_access_token?${params.toString()}`, withTimeout());
  const data = (await readJson(res)) as { access_token?: string; expires_in?: number };
  if (!res.ok || !data.access_token) {
    // Zu jung (unter 24 Stunden) oder Meta gerade nicht erreichbar: alten
    // Schlüssel weiter nutzen und beim nächsten Abruf erneut versuchen
    await setSetting(db, KEYS.lastError, `Verlängern: ${metaError(data, res.status)}`);
    return token;
  }
  await storeToken(db, data.access_token, data.expires_in);
  return data.access_token;
}

function parseFeed(raw: string | null): InstagramFeed | null {
  if (!raw) return null;
  try {
    const feed = JSON.parse(raw) as InstagramFeed;
    return Array.isArray(feed.posts) ? feed : null;
  } catch {
    return null;
  }
}

/** Profil und Beiträge neu bei Instagram holen und speichern */
export async function refreshFeed(db: D1Database): Promise<InstagramFeed> {
  let token = await getSetting(db, KEYS.token);
  if (!token) throw new Error('Instagram ist nicht verbunden');
  token = await refreshTokenIfDue(db, token);
  const [profile, posts] = await Promise.all([fetchProfile(token), fetchPosts(token)]);
  const feed: InstagramFeed = {
    fetchedAt: new Date().toISOString(),
    profile: {
      username: profile.username,
      name: profile.name,
      picture: profile.picture,
      followers: profile.followers,
      mediaCount: profile.mediaCount,
    },
    posts,
  };
  await setSetting(db, KEYS.feed, JSON.stringify(feed));
  await setSetting(db, KEYS.username, profile.username);
  await deleteSetting(db, KEYS.lastError);
  return feed;
}

/**
 * Feed für die Website: aus dem Zwischenspeicher, bei Bedarf neu geholt.
 * Schlägt das Holen fehl, bleibt der alte Stand sichtbar.
 */
export async function getPublicFeed(db: D1Database): Promise<InstagramFeed | null> {
  const [enabled, token, raw] = await Promise.all([
    getSetting(db, KEYS.enabled),
    getSetting(db, KEYS.token),
    getSetting(db, KEYS.feed),
  ]);
  if (enabled === '0' || !token) return null;
  const cached = parseFeed(raw);
  const age = cached ? Date.now() - Date.parse(cached.fetchedAt) : Infinity;
  if (cached && age < FEED_MAX_AGE_MS) return cached;
  // Nicht bei jedem Besuch erneut fragen, wenn Instagram gerade nicht liefert
  const lastAttempt = Date.parse((await getSetting(db, KEYS.lastAttempt)) ?? '');
  if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < RETRY_AFTER_MS) return cached;
  await setSetting(db, KEYS.lastAttempt, new Date().toISOString());
  try {
    return await refreshFeed(db);
  } catch (e) {
    await setSetting(db, KEYS.lastError, e instanceof Error ? e.message : String(e));
    return cached;
  }
}
