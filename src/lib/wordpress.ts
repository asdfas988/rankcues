type WordPressCredentials = {
  baseUrl: string;
  username: string;
  applicationPassword: string;
};

type WordPressRenderedField = {
  raw?: string;
  rendered?: string;
};

export type WordPressEditableContent = {
  id: number;
  type: "posts" | "pages";
  link: string;
  slug: string;
  status: string;
  title: string;
  content: string;
  excerpt: string;
};

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || parts[0] === 0;
}

export function normalizeWordPressBaseUrl(value: string) {
  const url = new URL(value.trim());
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:") throw new Error("WordPress connections must use HTTPS.");
  if (url.port && url.port !== "443") throw new Error("WordPress connections must use the standard HTTPS port.");
  if (
    hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
    || hostname === "::1"
    || hostname.startsWith("[")
    || isPrivateIpv4(hostname)
  ) {
    throw new Error("Private or local WordPress hosts cannot be connected.");
  }
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

function basicAuth(credentials: WordPressCredentials) {
  return `Basic ${Buffer.from(`${credentials.username}:${credentials.applicationPassword.replace(/\s+/g, "")}`).toString("base64")}`;
}

async function wordpressRequest<T>(
  credentials: WordPressCredentials,
  path: string,
  init: RequestInit = {},
) {
  const baseUrl = normalizeWordPressBaseUrl(credentials.baseUrl);
  const response = await fetch(`${baseUrl}/wp-json${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: basicAuth(credentials),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as {
    code?: string;
    message?: string;
  } & T;
  if (!response.ok) {
    const reason = payload.message || `WordPress returned HTTP ${response.status}.`;
    throw new Error(reason.slice(0, 500));
  }
  return payload;
}

export async function verifyWordPressConnection(credentials: WordPressCredentials) {
  const index = await wordpressRequest<{
    name?: string;
    namespaces?: string[];
    authentication?: Record<string, unknown>;
  }>(credentials, "/");
  if (!Array.isArray(index.namespaces) || !index.namespaces.includes("wp/v2")) {
    throw new Error("This site does not expose the WordPress wp/v2 REST API.");
  }
  const user = await wordpressRequest<{
    id: number;
    name?: string;
    slug?: string;
    capabilities?: Record<string, boolean>;
  }>(credentials, "/wp/v2/users/me?context=edit");
  const canEdit = Boolean(user.capabilities?.edit_posts || user.capabilities?.edit_pages);
  if (!canEdit) throw new Error("The WordPress user cannot edit posts or pages.");
  return {
    siteName: index.name || new URL(credentials.baseUrl).hostname,
    userId: Number(user.id),
    displayName: user.name || user.slug || credentials.username,
    capabilities: user.capabilities || {},
  };
}

function firstUrl(value: string) {
  const match = value.match(/https?:\/\/[^\s<>"')\]}]+/i)?.[0];
  return match ? match.replace(/[.,;:!?]+$/, "") : null;
}

function rendered(field: WordPressRenderedField | string | undefined) {
  if (typeof field === "string") return field;
  return field?.raw ?? field?.rendered ?? "";
}

export async function findWordPressContent(
  credentials: WordPressCredentials,
  affectedEntity: string,
) {
  const targetText = firstUrl(affectedEntity) || affectedEntity.trim();
  let slug = "";
  try {
    const targetUrl = new URL(targetText, `${normalizeWordPressBaseUrl(credentials.baseUrl)}/`);
    const baseHost = new URL(credentials.baseUrl).hostname.toLowerCase();
    if (targetUrl.hostname.toLowerCase() === baseHost) {
      const segments = targetUrl.pathname.split("/").filter(Boolean);
      slug = decodeURIComponent(segments.at(-1) || "");
    }
  } catch {
    slug = targetText.split("/").filter(Boolean).at(-1) || "";
  }
  slug = slug.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 160);
  if (!slug) throw new Error("The task does not identify a WordPress post or page URL.");

  for (const type of ["pages", "posts"] as const) {
    const rows = await wordpressRequest<Array<{
      id: number;
      link?: string;
      slug?: string;
      status?: string;
      title?: WordPressRenderedField;
      content?: WordPressRenderedField;
      excerpt?: WordPressRenderedField;
    }>>(credentials, `/wp/v2/${type}?slug=${encodeURIComponent(slug)}&context=edit&per_page=5`);
    const item = rows[0];
    if (item) {
      return {
        id: Number(item.id),
        type,
        link: item.link || targetText,
        slug: item.slug || slug,
        status: item.status || "publish",
        title: rendered(item.title),
        content: rendered(item.content),
        excerpt: rendered(item.excerpt),
      } satisfies WordPressEditableContent;
    }
  }
  throw new Error(`No editable WordPress page or post matched “${slug}”.`);
}

export async function createWordPressDraft(
  credentials: WordPressCredentials,
  input: {
    type: "posts" | "pages";
    title: string;
    content: string;
    excerpt?: string;
    sourceId: number;
  },
) {
  const draft = await wordpressRequest<{
    id: number;
    link?: string;
    status?: string;
    title?: WordPressRenderedField;
  }>(credentials, `/wp/v2/${input.type}`, {
    method: "POST",
    body: JSON.stringify({
      status: "draft",
      title: input.title.slice(0, 500),
      content: input.content.slice(0, 200_000),
      ...(input.type === "posts" && input.excerpt ? { excerpt: input.excerpt.slice(0, 10_000) } : {}),
    }),
  });
  return {
    id: Number(draft.id),
    link: draft.link || `${normalizeWordPressBaseUrl(credentials.baseUrl)}/?p=${draft.id}`,
    editUrl: `${normalizeWordPressBaseUrl(credentials.baseUrl)}/wp-admin/post.php?post=${draft.id}&action=edit`,
    status: draft.status || "draft",
    title: rendered(draft.title),
    sourceId: input.sourceId,
  };
}

export async function trashWordPressDraft(
  credentials: WordPressCredentials,
  type: "posts" | "pages",
  id: number,
) {
  return wordpressRequest<{ deleted?: boolean; previous?: { status?: string } }>(
    credentials,
    `/wp/v2/${type}/${id}?force=false`,
    { method: "DELETE" },
  );
}
