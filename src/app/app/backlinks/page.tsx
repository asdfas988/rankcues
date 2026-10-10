import { redirect } from "next/navigation";

// Paused: backlink data is not part of the current product surface.
// The full page is preserved at git tag archive/full-version-2026-10-09.
export default function BacklinksPage() {
  redirect("/app/audit");
}
