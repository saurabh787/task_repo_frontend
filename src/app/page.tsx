"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const handleStart = () => {
    const token = localStorage.getItem("accessToken");
    router.push(token ? "/dashboard" : "/login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-4xl space-y-6 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
            V2 UI Refresh
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Fast. Focused. Friendly.
          </span>
        </div>
        <div className="space-y-3">
          <h1 className="font-serif text-4xl text-slate-900 dark:text-white sm:text-5xl">
            Task Manager
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 sm:text-lg">
            Keep your day light and organized. Track tasks, toggle progress, and stay in
            control with a calm, minimal dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 dark:shadow-blue-900/40"
            onClick={handleStart}
          >
            Get started
          </button>
          <button
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            onClick={() => router.push("/register")}
          >
            Create account
          </button>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-slate-700">
            Secure login
          </span>
          <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-slate-700">
            Fast search
          </span>
          <span className="rounded-full border border-slate-200 px-3 py-1 dark:border-slate-700">
            Cursor pagination
          </span>
        </div>
      </section>
    </main>
  );
}
