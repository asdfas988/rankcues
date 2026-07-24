export default function AppLoading() {
  return (
    <main className="min-h-screen bg-[#f4f6fa] p-6 text-[#111827] lg:pl-[248px] lg:pt-24">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-3 w-28 rounded bg-[#dfe3eb]" />
        <div className="mt-4 h-10 w-3/5 rounded-lg bg-[#dfe3eb]" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-32 rounded-2xl border border-[#e2e7ef] bg-white" />)}
        </div>
        <div className="mt-4 h-72 rounded-2xl border border-[#e2e7ef] bg-white" />
      </div>
    </main>
  );
}
