"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ReviewData = {
  tagNumber: string;
  poleCondition: string;
  padCondition: string;
  overviewNotes: string;
  baseNotes: string;
  confidence: number;
  fileCounts: {
    tag: number;
    overview: number;
    base: number;
    pad: number;
  };
};

const CONDITION_OPTIONS = ["Excellent", "Good", "Fair", "Poor", "Critical"];

export default function SubmissionReviewPage() {
  const router = useRouter();
  const [data, setData] = useState<ReviewData | null>(null);
  const [edited, setEdited] = useState<ReviewData | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("submissionReview");
    if (!raw) {
      router.replace("/portal/submission");
      return;
    }
    const parsed = JSON.parse(raw) as ReviewData;
    setData(parsed);
    setEdited(parsed);
  }, [router]);

  function update<K extends keyof ReviewData>(key: K, value: ReviewData[K]) {
    setEdited((prev) => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  function handleConfirm() {
    sessionStorage.removeItem("submissionReview");
    setSaved(true);
    setTimeout(() => router.push("/portal"), 1500);
  }

  if (!edited) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl bg-white p-10 shadow-lg text-blue-900">
          Loading…
        </div>
      </main>
    );
  }

  const hasChanges = JSON.stringify(edited) !== JSON.stringify(data);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-3xl bg-white p-10 shadow-lg">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-blue-950">
              Submission Review
            </h1>
            <p className="mt-2 text-blue-900/80">
              Review and correct the AI's findings before confirming.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              AI Confidence
            </span>
            <div className="flex items-center gap-3">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${edited.confidence}%` }}
                />
              </div>
              <span className="text-lg font-bold text-blue-950">
                {edited.confidence}%
              </span>
            </div>
          </div>
        </div>

        {/* File count summary */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Tag",      count: edited.fileCounts.tag      },
            { label: "Overview", count: edited.fileCounts.overview  },
            { label: "Base",     count: edited.fileCounts.base      },
            { label: "Pad",      count: edited.fileCounts.pad       },
          ].map(({ label, count }) => (
            <div key={label} className="rounded-2xl bg-blue-50 px-5 py-4 text-center ring-1 ring-blue-100">
              <p className="text-2xl font-extrabold text-blue-950">{count}</p>
              <p className="mt-1 text-xs font-semibold text-blue-700">
                {label} photo{count !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>

        {/* Editable fields */}
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <Field label="Tag Number" aiGenerated>
            <input
              type="text"
              value={edited.tagNumber}
              onChange={(e) => update("tagNumber", e.target.value)}
              className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </Field>

          <Field label="Pole Condition" aiGenerated>
            <select
              value={edited.poleCondition}
              onChange={(e) => update("poleCondition", e.target.value)}
              className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {CONDITION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Pad-Mounted Equipment Condition" aiGenerated>
            <select
              value={edited.padCondition}
              onChange={(e) => update("padCondition", e.target.value)}
              className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {CONDITION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Overview Notes" aiGenerated>
            <textarea
              rows={3}
              value={edited.overviewNotes}
              onChange={(e) => update("overviewNotes", e.target.value)}
              className="w-full resize-none rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </Field>

          <Field label="Base Notes" aiGenerated>
            <textarea
              rows={3}
              value={edited.baseNotes}
              onChange={(e) => update("baseNotes", e.target.value)}
              className="w-full resize-none rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </Field>
        </div>

        {hasChanges && (
          <p className="mt-6 text-sm font-semibold text-yellow-600">
            ✎ You have made changes from the AI's original output.
          </p>
        )}

        {/* Actions */}
        <div className="mt-10 flex flex-wrap gap-4">
          <button
            onClick={() => router.push("/portal/submission")}
            className="rounded-xl bg-blue-50 px-7 py-3 text-sm font-bold text-blue-950 ring-1 ring-blue-200 transition hover:bg-blue-100 active:scale-[0.98]"
          >
            ← Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={saved}
            className="rounded-xl bg-yellow-400 px-7 py-3 text-sm font-bold text-black shadow-sm transition-all duration-150 hover:bg-yellow-300 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {saved ? "Saved! Redirecting…" : "Confirm & Save →"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  aiGenerated,
  children,
}: {
  label: string;
  aiGenerated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-bold text-blue-950">{label}</label>
        {aiGenerated && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-600">
            AI
          </span>
        )}
      </div>
      {children}
    </div>
  );
}