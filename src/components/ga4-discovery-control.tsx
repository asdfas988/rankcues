"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCw } from "lucide-react";

type DiscoveryResponse = { status?: string };

export function Ga4DiscoveryControl({
  retryLabel,
  reconnectLabel,
  successLabel,
  failureLabel,
  networkErrorLabel,
  showReconnect = false,
}: {
  retryLabel: string;
  reconnectLabel: string;
  successLabel: string;
  failureLabel: string;
  networkErrorLabel: string;
  showReconnect?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function discover() {
    setPending(true);
    setMessage(null);
    setFailed(false);
    try {
      const response = await fetch("/api/integrations/ga4/properties", {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const body = await response.json().catch(() => ({})) as DiscoveryResponse;
      if (!response.ok || body.status === "failed") {
        setFailed(true);
        setMessage(failureLabel);
        router.refresh();
        return;
      }
      setMessage(successLabel);
      router.refresh();
    } catch {
      setFailed(true);
      setMessage(networkErrorLabel);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={discover}
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#111827] px-4 text-[11px] font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {retryLabel}
        </button>
        {showReconnect ? (
          <Link href="/api/auth/google?returnTo=/app/traffic" className="inline-flex h-9 items-center rounded-lg border border-[#dfe3eb] bg-white px-4 text-[11px] font-semibold text-[#344054]">
            {reconnectLabel}
          </Link>
        ) : null}
      </div>
      {message ? <p role="status" className={`max-w-md text-[10px] leading-5 ${failed ? "text-[#b42318]" : "text-[#087f6b]"}`}>{message}</p> : null}
    </div>
  );
}
