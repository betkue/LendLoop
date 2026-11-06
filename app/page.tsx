// Temporary home page; replaced by the public landing page in the tools module.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">LendLoop</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Borrow what you need. Lend what you don&apos;t.
      </p>
    </main>
  );
}
