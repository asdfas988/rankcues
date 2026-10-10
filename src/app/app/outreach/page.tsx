import { redirect } from "next/navigation";

// Paused: outreach is not part of the current product surface.
export default function OutreachPage() {
  redirect("/app/overview");
}
