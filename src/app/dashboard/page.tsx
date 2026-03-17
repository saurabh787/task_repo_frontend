"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ThemeToggle from "../../components/ThemeToggle";
import { apiFetch, apiFetchWithAuth } from "../../services/api";
import { Task } from "../../types/task";

type StatusFilter = "ALL" | "PENDING" | "COMPLETED";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Tasks", href: "/dashboard" },
  { label: "Analytics", href: "#", disabled: true },
  { label: "Settings", href: "#", disabled: true }
];

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const isOverdue = (value?: string | null) => {
  if (!value) {
    return false;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const todayMin = (() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
  })();

  const getAccessToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const buildQuery = (
    cursorValue: string | null,
    searchValue: string,
    statusValue: StatusFilter
  ) => {
    const params = new URLSearchParams();
    params.set("limit", "10");
    if (cursorValue) {
      params.set("cursor", cursorValue);
    }
    if (statusValue !== "ALL") {
      params.set("status", statusValue);
    }
    const trimmed = searchValue.trim();
    if (trimmed.length > 0) {
      params.set("search", trimmed);
    }
    return params.toString();
  };

  const fetchTasks = async ({
    reset = false,
    searchValue,
    statusValue
  }: {
    reset?: boolean;
    searchValue?: string;
    statusValue?: StatusFilter;
  } = {}) => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      router.push("/login");
      return;
    }

    const effectiveSearch = searchValue ?? search;
    const effectiveStatus = statusValue ?? statusFilter;
    const query = buildQuery(reset ? null : nextCursor, effectiveSearch, effectiveStatus);

    setError("");
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await apiFetchWithAuth(`/tasks?${query}`);
      const incoming = data.data || [];
      setTasks((prev) => (reset ? incoming : [...prev, ...incoming]));
      const cursorFromApi = data?.pagination?.nextCursor ?? null;
      setNextCursor(cursorFromApi);
      setHasMore(Boolean(cursorFromApi));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tasks";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    fetchTasks({ reset: true });
  }, []);

  const handleAddTask = async () => {
    if (!title.trim()) {
      return;
    }
    try {
      await apiFetchWithAuth("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: description.trim() ? description.trim() : undefined,
          dueDate: dueDate ? dueDate : undefined
        })
      });
      toast.success("Task added");
      setTitle("");
      setDescription("");
      setDueDate("");
      fetchTasks({ reset: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add task";
      setError(message);
      toast.error(message);
    }
  };

  const handleToggle = async (taskId: string) => {
    try {
      await apiFetchWithAuth(`/tasks/${taskId}/toggle`, { method: "PATCH" });
      toast.success("Task updated");
      fetchTasks({ reset: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle task";
      setError(message);
      toast.error(message);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await apiFetchWithAuth(`/tasks/${taskId}`, { method: "DELETE" });
      toast.success("Task deleted");
      fetchTasks({ reset: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete task";
      setError(message);
      toast.error(message);
    }
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
  };

  const handleEditSave = async () => {
    if (!editingTask) {
      return;
    }
    try {
      await apiFetchWithAuth(`/tasks/${editingTask.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle.trim() || undefined,
          description: editDescription.trim() ? editDescription.trim() : undefined,
          dueDate: editDueDate ? editDueDate : null
        })
      });
      toast.success("Task updated");
      setEditingTask(null);
      fetchTasks({ reset: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update task";
      setError(message);
      toast.error(message);
    }
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken })
        });
      } catch {
        // Ignore logout errors and clear local state.
      }
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    toast.success("Logged out");
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white/95 p-6 shadow-xl transition-transform dark:border-slate-800 dark:bg-slate-900/95 md:static md:translate-x-0 md:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Task Manager
            </p>
            <h2 className="text-xl font-semibold">Workspace</h2>
          </div>
          <button
            className="rounded-full border border-slate-200 px-3 py-2 text-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            Close
          </button>
        </div>

        <nav className="mt-8 space-y-2">
          {navItems.map((item) => {
            const active = item.href !== "#" && pathname.startsWith(item.href);
            const baseClasses =
              "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition";
            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  className={`${baseClasses} cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500`}
                >
                  {item.label}
                </div>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`${baseClasses} ${
                  active
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-10 text-xs text-slate-400">
          Version 2 · Light UI
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              Menu
            </button>
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Dashboard</h1>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                Plan, track, and close tasks in one flow.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-300 sm:inline-flex">
              {tasks.length} tasks
            </span>
            <ThemeToggle />
            <button
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="px-4 py-6 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold">Create task</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Add a focused task and a due date if needed.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-center">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:col-start-1 sm:row-start-1"
                  placeholder="New task title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <input
                  type="date"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:col-start-2 sm:row-start-1"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  min={todayMin}
                />
                <div className="sm:col-span-3 sm:row-start-2">
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    placeholder="Task description (optional)"
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <button
                  className="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 sm:col-start-3 sm:row-start-1 sm:w-auto"
                  onClick={handleAddTask}
                >
                  Add task
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold">Filters</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Focus on the tasks that need attention.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  placeholder="Search tasks"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                >
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-auto"
                    onClick={() => fetchTasks({ reset: true })}
                  >
                    Apply filters
                  </button>
                  <button
                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:w-auto"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                      fetchTasks({
                        reset: true,
                        searchValue: "",
                        statusValue: "ALL"
                      });
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">My tasks</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Toggle, edit, and finish tasks with confidence.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                Showing {tasks.length} tasks
              </span>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            {loading ? (
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                Loading tasks...
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                {tasks.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No tasks yet. Add your first one.
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <h3
                          className={`text-sm font-semibold ${
                            task.status === "COMPLETED"
                              ? "text-slate-400 line-through"
                              : "text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {task.title}
                        </h3>
                        {task.description ? (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {task.description}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span
                            className={`rounded-full px-3 py-1 ${
                              task.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                            }`}
                          >
                            {task.status}
                          </span>
                          {task.dueDate ? (
                            <span
                              className={`rounded-full px-3 py-1 ${
                                isOverdue(task.dueDate) && task.status !== "COMPLETED"
                                  ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-200"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              Due {formatDate(task.dueDate)}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                              No due date
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-auto"
                          onClick={() => openEdit(task)}
                        >
                          Edit
                        </button>
                        <button
                          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-auto"
                          onClick={() => handleToggle(task.id)}
                        >
                          Toggle
                        </button>
                        <button
                          className="w-full rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 sm:w-auto"
                          onClick={() => handleDelete(task.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {hasMore && !loading ? (
              <button
                className="mt-6 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                onClick={() => fetchTasks({ reset: false })}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            ) : null}
          </div>
        </section>
      </main>

      {editingTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold">Edit task</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Update the title and due date for this task.
            </p>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
              <textarea
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                rows={3}
                placeholder="Task description (optional)"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
              <input
                type="date"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                value={editDueDate}
                onChange={(event) => setEditDueDate(event.target.value)}
                min={todayMin}
              />
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-auto"
                onClick={() => setEditingTask(null)}
              >
                Cancel
              </button>
              <button
                className="w-full rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 sm:w-auto"
                onClick={handleEditSave}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
