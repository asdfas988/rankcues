"use client";

import { CircleAlert, RefreshCw } from "lucide-react";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6fa] px-5 text-[#111827]">
      <section className="w-full max-w-lg rounded-3xl border border-[#e2e7ef] bg-white p-8 text-center shadow-[0_24px_80px_rgba(16,24,40,0.08)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#fff2f0] text-[#b42318]"><CircleAlert size={21} /></span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">This view could not be loaded</h1>
        <p className="mt-3 text-sm leading-6 text-[#667085]">Your data was not changed. Retry the request; if it continues, check the service health page.</p>
        <button onClick={reset} className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[#111827] px-4 text-xs font-semibold text-white"><RefreshCw size={14} /> Try again</button>
      </section>
    </main>
  );
}
