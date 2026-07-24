export async function readRequestData(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json().catch(() => ({}))) as Record<string, unknown>;
  }

  const formData = await request.formData().catch(() => new FormData());
  return Object.fromEntries(formData.entries()) as Record<string, FormDataEntryValue>;
}

export function splitLines(value: unknown) {
  return value
    ?.toString()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean) ?? [];
}

export function respond(request: Request, body: Record<string, unknown>, payload: unknown, fallbackPath: string, init?: ResponseInit) {
  const contentType = request.headers.get("content-type") ?? "";
  const accept = request.headers.get("accept") ?? "";
  const wantsJson = contentType.includes("application/json") || accept.includes("application/json");

  if (!wantsJson && request.method === "POST") {
    const redirectTo = body.redirectTo?.toString() || fallbackPath;
    return Response.redirect(new URL(redirectTo, request.url), 303);
  }

  return Response.json(payload, init);
}
