import { createHash } from "node:crypto";
import { ensureDatabaseSchema, getDatabase } from "@/lib/database";

export async function enforceActionLimit(input: {
  workspaceId: string;
  action: string;
  limit: number;
  windowSeconds: number;
}) {
  try {
    await ensureDatabaseSchema();
    const sql = getDatabase();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const windowKey = Math.floor(nowSeconds / input.windowSeconds);
    const id = createHash("sha256")
      .update(`${input.workspaceId}\u001f${input.action}\u001f${windowKey}`)
      .digest("hex")
      .slice(0, 32);
    const expiresAt = new Date((windowKey + 1) * input.windowSeconds * 1000);
    const [row] = await sql`
      insert into rankcues_action_windows (
        id, workspace_id, action, window_key, request_count, expires_at
      ) values (
        ${id}, ${input.workspaceId}, ${input.action}, ${windowKey}, 1, ${expiresAt}
      )
      on conflict (workspace_id, action, window_key) do update set
        request_count = rankcues_action_windows.request_count + 1,
        updated_at = now()
      returning request_count
    `;
    const count = Number(row.request_count || 0);
    if (count <= input.limit) return null;
    const retryAfter = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    return Response.json(
      { status: "rate_limited", message: "This action is already running too frequently. Try again later.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Action limit check failed", error);
    return Response.json(
      { status: "temporarily_unavailable", message: "The action guard is temporarily unavailable. No job was started." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
