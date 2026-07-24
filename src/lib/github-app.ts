import { createHmac, createSign, timingSafeEqual } from "node:crypto";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";

type GitHubConfig = {
  appId: string;
  appSlug: string;
  privateKey: string;
  stateSecret: string;
};

export type GitHubRepositoryFile = {
  path: string;
  sha: string;
  content: string;
};

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function getGitHubConfig(): GitHubConfig | null {
  const appId = process.env.GITHUB_APP_ID;
  const appSlug = process.env.GITHUB_APP_SLUG;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const stateSecret = process.env.GITHUB_STATE_SECRET
    || process.env.SESSION_SECRET
    || process.env.APP_ENCRYPTION_KEY;
  if (!appId || !appSlug || !privateKey || !stateSecret) return null;
  return { appId, appSlug, privateKey, stateSecret };
}

export function getGitHubAppPublicStatus() {
  const config = getGitHubConfig();
  return {
    configured: Boolean(config),
    service: "github_app" as const,
    installUrl: config ? `https://github.com/apps/${encodeURIComponent(config.appSlug)}/installations/new` : null,
  };
}

function createAppJwt(config: GitHubConfig) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: config.appId }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(config.privateKey).toString("base64url")}`;
}

async function githubRequest<T>(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
      "User-Agent": "RankCues",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as { message?: string } & T;
  if (!response.ok) {
    throw new Error((payload.message || `GitHub returned HTTP ${response.status}.`).slice(0, 500));
  }
  return payload;
}

export function createGitHubInstallState(input: {
  workspaceId: string;
  email: string;
  returnTo?: string;
}) {
  const config = getGitHubConfig();
  if (!config) throw new Error("GitHub App is not configured.");
  const payload = base64url(JSON.stringify({
    workspaceId: input.workspaceId,
    email: input.email.toLowerCase(),
    returnTo: input.returnTo?.startsWith("/app/") ? input.returnTo : "/app/settings",
    expiresAt: Date.now() + 10 * 60 * 1000,
  }));
  const signature = createHmac("sha256", config.stateSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyGitHubInstallState(value: string) {
  const config = getGitHubConfig();
  if (!config) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", config.stateSecret).update(payload).digest("base64url");
  const signatureBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (signatureBytes.length !== expectedBytes.length || !timingSafeEqual(signatureBytes, expectedBytes)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      workspaceId?: string;
      email?: string;
      returnTo?: string;
      expiresAt?: number;
    };
    if (!parsed.workspaceId || !parsed.email || !parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getGitHubInstallation(installationId: number) {
  const config = getGitHubConfig();
  if (!config) throw new Error("GitHub App is not configured.");
  const installation = await githubRequest<{
    id: number;
    account?: { login?: string; type?: string; avatar_url?: string };
    repository_selection?: string;
    permissions?: Record<string, string>;
    suspended_at?: string | null;
  }>(`/app/installations/${installationId}`, createAppJwt(config));
  if (installation.suspended_at) throw new Error("This GitHub App installation is suspended.");
  if (installation.permissions?.contents !== "write" || installation.permissions?.pull_requests !== "write") {
    throw new Error("The GitHub App installation needs Contents and Pull requests write permissions.");
  }
  return installation;
}

export async function createGitHubInstallationToken(installationId: number) {
  const config = getGitHubConfig();
  if (!config) throw new Error("GitHub App is not configured.");
  const payload = await githubRequest<{ token: string; expires_at: string }>(
    `/app/installations/${installationId}/access_tokens`,
    createAppJwt(config),
    {
      method: "POST",
      body: JSON.stringify({
        permissions: { contents: "write", pull_requests: "write", metadata: "read" },
      }),
    },
  );
  return payload.token;
}

export async function listGitHubInstallationRepositories(installationId: number) {
  const token = await createGitHubInstallationToken(installationId);
  const repositories: Array<{
    id: number;
    fullName: string;
    defaultBranch: string;
    private: boolean;
    htmlUrl: string;
  }> = [];
  for (let page = 1; page <= 5; page += 1) {
    const payload = await githubRequest<{
      repositories?: Array<{
        id: number;
        full_name: string;
        default_branch: string;
        private: boolean;
        html_url: string;
      }>;
    }>(`/installation/repositories?per_page=100&page=${page}`, token);
    const rows = payload.repositories || [];
    repositories.push(...rows.map((repository) => ({
      id: Number(repository.id),
      fullName: repository.full_name,
      defaultBranch: repository.default_branch,
      private: Boolean(repository.private),
      htmlUrl: repository.html_url,
    })));
    if (rows.length < 100) break;
  }
  return repositories;
}

function encodeRepositoryPath(value: string) {
  return value.split("/").map(encodeURIComponent).join("/");
}

function taskTokens(value: string) {
  return new Set(
    value.toLowerCase()
      .split(/[^a-z0-9_-]+/)
      .filter((token) => token.length >= 3)
      .slice(0, 40),
  );
}

function pathScore(path: string, tokens: Set<string>) {
  const lower = path.toLowerCase();
  let score = 0;
  for (const token of tokens) if (lower.includes(token)) score += 8;
  if (/(^|\/)(app|pages|src|content|posts|blog)\//.test(lower)) score += 5;
  if (/(page|layout|seo|metadata|head|sitemap|robots|schema)/.test(lower)) score += 4;
  if (/\.(md|mdx|html|tsx|jsx|ts|js|astro|vue|json)$/.test(lower)) score += 3;
  if (/(node_modules|dist|build|\.next|package-lock|pnpm-lock|yarn\.lock)/.test(lower)) score -= 100;
  return score;
}

export async function getGitHubRepositoryContext(input: {
  installationId: number;
  fullName: string;
  defaultBranch: string;
  taskText: string;
}) {
  const token = await createGitHubInstallationToken(input.installationId);
  const repositoryPath = `/repos/${encodeRepositoryPath(input.fullName)}`;
  const ref = await githubRequest<{ object: { sha: string } }>(
    `${repositoryPath}/git/ref/heads/${encodeURIComponent(input.defaultBranch)}`,
    token,
  );
  const commit = await githubRequest<{ tree: { sha: string } }>(
    `${repositoryPath}/git/commits/${ref.object.sha}`,
    token,
  );
  const tree = await githubRequest<{
    tree?: Array<{ path: string; type: string; size?: number }>;
    truncated?: boolean;
  }>(`${repositoryPath}/git/trees/${commit.tree.sha}?recursive=1`, token);
  const tokens = taskTokens(input.taskText);
  const candidates = (tree.tree || [])
    .filter((item) => item.type === "blob" && (item.size || 0) <= 120_000)
    .map((item) => ({ path: item.path, score: pathScore(item.path, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, 8);
  const files: GitHubRepositoryFile[] = [];
  let totalCharacters = 0;
  for (const candidate of candidates) {
    const file = await githubRequest<{ sha: string; content?: string; encoding?: string }>(
      `${repositoryPath}/contents/${encodeRepositoryPath(candidate.path)}?ref=${encodeURIComponent(input.defaultBranch)}`,
      token,
    );
    if (file.encoding !== "base64" || !file.content) continue;
    const content = Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8");
    if (totalCharacters + content.length > 90_000) continue;
    totalCharacters += content.length;
    files.push({ path: candidate.path, sha: file.sha, content });
  }
  if (!files.length) {
    throw new Error("No suitable text files were found in the mapped repository for this task.");
  }
  return {
    baseSha: ref.object.sha,
    treeTruncated: Boolean(tree.truncated),
    files,
  };
}

function safeBranchPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 45) || "seo-task";
}

export async function createGitHubDraftPullRequest(input: {
  installationId: number;
  fullName: string;
  defaultBranch: string;
  taskId: string;
  taskTitle: string;
  prTitle: string;
  prBody: string;
  files: Array<{ path: string; content: string; sha?: string }>;
}) {
  const token = await createGitHubInstallationToken(input.installationId);
  const repositoryPath = `/repos/${encodeRepositoryPath(input.fullName)}`;
  const ref = await githubRequest<{ object: { sha: string } }>(
    `${repositoryPath}/git/ref/heads/${encodeURIComponent(input.defaultBranch)}`,
    token,
  );
  const branch = `rankcues/${safeBranchPart(input.taskTitle)}-${input.taskId.slice(0, 8)}`;
  await githubRequest(
    `${repositoryPath}/git/refs`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: ref.object.sha }),
    },
  );
  for (const file of input.files.slice(0, 5)) {
    if (
      !file.path
      || file.path.startsWith("/")
      || file.path.includes("..")
      || file.path.startsWith(".github/workflows/")
      || file.content.length > 200_000
    ) {
      throw new Error(`Unsafe or unsupported GitHub file path: ${file.path || "unknown"}`);
    }
    await githubRequest(
      `${repositoryPath}/contents/${encodeRepositoryPath(file.path)}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify({
          message: `RankCues: ${input.taskTitle}`.slice(0, 250),
          content: Buffer.from(file.content).toString("base64"),
          branch,
          ...(file.sha ? { sha: file.sha } : {}),
        }),
      },
    );
  }
  const pull = await githubRequest<{ number: number; html_url: string; state: string }>(
    `${repositoryPath}/pulls`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        title: input.prTitle.slice(0, 250),
        body: input.prBody.slice(0, 60_000),
        head: branch,
        base: input.defaultBranch,
        draft: true,
        maintainer_can_modify: true,
      }),
    },
  );
  return { number: pull.number, url: pull.html_url, branch, state: pull.state };
}

export async function closeGitHubPullRequest(input: {
  installationId: number;
  fullName: string;
  pullNumber: number;
}) {
  const token = await createGitHubInstallationToken(input.installationId);
  return githubRequest<{ number: number; html_url: string; state: string }>(
    `/repos/${encodeRepositoryPath(input.fullName)}/pulls/${input.pullNumber}`,
    token,
    { method: "PATCH", body: JSON.stringify({ state: "closed" }) },
  );
}
