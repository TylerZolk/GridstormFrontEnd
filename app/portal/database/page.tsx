"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type FileCounts = {
  tag: number;
  overview: number;
  base: number;
  pad: number;
};

type Submission = {
  id: string;
  createdAt: number;
  submittedBy: string;
  tagNumber: string;
  poleCondition: string;
  padCondition: string;
  overviewNotes: string;
  baseNotes: string;
  confidence: number;
  fileCounts: FileCounts;
};

const CONDITION_COLORS: Record<string, string> = {
  Excellent: "bg-green-100 text-green-800",
  Good:      "bg-blue-100  text-blue-800",
  Fair:      "bg-yellow-100 text-yellow-800",
  Poor:      "bg-orange-100 text-orange-800",
  Critical:  "bg-red-100   text-red-800",
};

function ConditionBadge({ value }: { value: string }) {
  const cls = CONDITION_COLORS[value] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>
      {value || "—"}
    </span>
  );
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DatabasePage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);

  useEffect(() => {
    fetch("/api/submissions/list")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.ok) setSubmissions(data.submissions);
        else setError(data.error || "Failed to load submissions.");
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="rounded-3xl bg-white p-10 shadow-lg">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-blue-950">
              Submission Database
            </h1>
            <p className="mt-1 text-blue-900/70">
              All confirmed inspection reports, newest first.
            </p>
          </div>
          <span className="rounded-2xl bg-blue-50 px-5 py-2 text-sm font-bold text-blue-900 ring-1 ring-blue-100">
            {submissions.length} record{submissions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* States */}
        {loading && (
          <div className="mt-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && submissions.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-6xl">📋</p>
            <p className="mt-4 text-xl font-bold text-blue-950">No submissions yet</p>
            <p className="mt-1 text-blue-900/60">
              Confirmed inspection reports will appear here.
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && submissions.length > 0 && (
          <div className="mt-8 overflow-x-auto rounded-2xl ring-1 ring-blue-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-700">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Tag #</th>
                  <th className="px-5 py-3">Submitted By</th>
                  <th className="px-5 py-3">Pole</th>
                  <th className="px-5 py-3">Pad</th>
                  <th className="px-5 py-3">Confidence</th>
                  <th className="px-5 py-3">Photos</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer transition-colors hover:bg-blue-50/50"
                    onClick={() => setSelected(s)}
                  >
                    <td className="px-5 py-3 text-blue-900/70">{formatDate(s.createdAt)}</td>
                    <td className="px-5 py-3 font-bold text-blue-950">{s.tagNumber || "—"}</td>
                    <td className="px-5 py-3 text-blue-900/80">{s.submittedBy}</td>
                    <td className="px-5 py-3"><ConditionBadge value={s.poleCondition} /></td>
                    <td className="px-5 py-3"><ConditionBadge value={s.padCondition} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-blue-100">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${s.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-blue-950">{s.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-blue-900/60">
                      {s.fileCounts.tag + s.fileCounts.overview + s.fileCounts.base + s.fileCounts.pad}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold text-blue-500 hover:underline">
                        View →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-blue-950">
                  Tag #{selected.tagNumber || "—"}
                </h2>
                <p className="text-sm text-blue-900/60">{formatDate(selected.createdAt)} · {selected.submittedBy}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full bg-blue-50 p-2 text-blue-900 hover:bg-blue-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Detail label="Pole Condition">
                <ConditionBadge value={selected.poleCondition} />
              </Detail>
              <Detail label="Pad Condition">
                <ConditionBadge value={selected.padCondition} />
              </Detail>
              <Detail label="AI Confidence">
                <span className="font-bold text-blue-950">{selected.confidence}%</span>
              </Detail>
              <Detail label="Photos">
                <span className="font-bold text-blue-950">
                  {selected.fileCounts.tag}T · {selected.fileCounts.overview}O · {selected.fileCounts.base}B · {selected.fileCounts.pad}P
                </span>
              </Detail>
            </div>

            {selected.overviewNotes && (
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Overview Notes</p>
                <p className="mt-1 text-sm text-blue-900">{selected.overviewNotes}</p>
              </div>
            )}
            {selected.baseNotes && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Base Notes</p>
                <p className="mt-1 text-sm text-blue-900">{selected.baseNotes}</p>
              </div>
            )}

            <button
              onClick={() => setSelected(null)}
              className="mt-8 w-full rounded-xl bg-blue-50 py-3 text-sm font-bold text-blue-950 ring-1 ring-blue-200 hover:bg-blue-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-blue-50 p-3 ring-1 ring-blue-100">
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
