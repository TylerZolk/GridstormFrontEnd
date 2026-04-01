"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ReviewData = {
  tagNumber: string;
  poleCondition: string;
  padCondition: string;
  overviewNotes: string;
  baseNotes: string;
  vegetationEncroachment: boolean;
  fileCounts: { tag: number; overview: number; base: number; pad: number };
  photoUrls?: { tag: string[]; overview: string[]; base: string[]; pad: string[] };
  aiImages?: { tag?: string; overview?: string };
  historicalSubmission?: any;
};

type FlagKey = "review";

const CONDITION_OPTIONS = ["Excellent", "Good", "Fair", "Poor", "Critical"];

const FLAG_META: Record<FlagKey, { label: string; color: string }> = {
  review: { label: "Flag for Review", color: "bg-purple-100 text-purple-800 ring-purple-300" },
};

export default function SubmissionReviewPage() {
  const router = useRouter();
  const [data, setData]       = useState<ReviewData | null>(null);
  const [edited, setEdited]   = useState<ReviewData | null>(null);
  const [extraFlags, setExtraFlags] = useState<FlagKey[]>([]);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("submissionReview");
    if (!raw) { router.replace("/portal/submission"); return; }
    const parsed = JSON.parse(raw) as ReviewData;
    setData(parsed);
    setEdited(parsed);
  }, [router]);

  useEffect(() => {
    if (!edited || !edited.tagNumber || edited.tagNumber === "UNKNOWN" || edited.tagNumber === "UNREADABLE") return;
    
    const timeoutId = setTimeout(async () => {
      // Don't refetch if it exactly matches the data.tagNumber and we already loaded its history originally
      if (data && edited.tagNumber === data.tagNumber && data.historicalSubmission) {
        if (!edited.historicalSubmission) {
          setEdited(p => p ? { ...p, historicalSubmission: data.historicalSubmission } : p);
        }
        return;
      }
      
      try {
        const histRes = await fetch(`/api/submissions/by-tag?tag=${encodeURIComponent(edited.tagNumber)}`);
        if (histRes.ok) {
          const histJson = await histRes.json();
          if (histJson.submission) {
            setEdited(p => p ? { ...p, historicalSubmission: histJson.submission } : p);
          } else {
            setEdited(p => p ? { ...p, historicalSubmission: undefined } : p);
          }
        }
      } catch (e) {
        console.warn("History fetch failed:", e);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [edited?.tagNumber, data]);

  function update<K extends keyof ReviewData>(key: K, value: ReviewData[K]) {
    setEdited((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
    setError(null);
  }

  function toggleFlag(flag: FlagKey) {
    setExtraFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  }

  async function handleConfirm() {
    if (!edited) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagNumber:              edited.tagNumber,
          poleCondition:          edited.poleCondition,
          padCondition:           edited.padCondition,
          overviewNotes:          edited.overviewNotes,
          baseNotes:              edited.baseNotes,
          vegetationEncroachment: edited.vegetationEncroachment,
          extraFlags,
          photoUrls: edited.photoUrls ?? { tag: [], overview: [], base: [], pad: [] },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setError(json?.error || "Failed to save submission."); return; }
      sessionStorage.removeItem("submissionReview");
      setSaved(true);
      setTimeout(() => router.push("/portal"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  if (!edited) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl bg-white p-10 shadow-lg text-blue-900">Loading…</div>
      </main>
    );
  }

  const hasChanges =
    JSON.stringify({
      tagNumber: edited.tagNumber, poleCondition: edited.poleCondition,
      padCondition: edited.padCondition, overviewNotes: edited.overviewNotes,
      baseNotes: edited.baseNotes, vegetationEncroachment: edited.vegetationEncroachment,
    }) !==
    JSON.stringify({
      tagNumber: data?.tagNumber, poleCondition: data?.poleCondition,
      padCondition: data?.padCondition, overviewNotes: data?.overviewNotes,
      baseNotes: data?.baseNotes, vegetationEncroachment: data?.vegetationEncroachment,
    });

  const autoFlags: string[] = [];
  if (edited.vegetationEncroachment) autoFlags.push("vegetation");

  const aiTagImg      = edited.aiImages?.tag;
  const aiOverviewImg = edited.aiImages?.overview;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="rounded-3xl bg-white p-10 shadow-lg">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-blue-950">
              Submission Review
            </h1>
            <p className="mt-2 text-blue-900/70">
              AI results are pre-filled below. Correct anything before confirming.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {autoFlags.includes("vegetation") && (
              <FlagPill color="bg-green-100 text-green-800 ring-green-300" label="🌿 Vegetation" />
            )}
            {extraFlags.includes("review") && (
              <FlagPill color="bg-purple-100 text-purple-800 ring-purple-300" label="🔍 Review" />
            )}
            {autoFlags.length === 0 && extraFlags.length === 0 && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-500 ring-1 ring-blue-100">
                No flags
              </span>
            )}
          </div>
        </div>

        {/* ── Historical Comparison ── */}
        {edited.historicalSubmission && (
          <div className="mt-8 rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-yellow-800 flex items-center gap-2">
              <span>⚠️ Duplicate Tag Detected!</span>
            </h2>
            <p className="mt-2 text-sm text-yellow-900">
              A previous inspection for tag <strong>#{edited.tagNumber}</strong> was completed on{" "}
              {new Date(edited.historicalSubmission.createdAt).toLocaleDateString()} by{" "}
              {edited.historicalSubmission.submittedBy}.
            </p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase text-yellow-600">Prev. Pole</p>
                <p className="mt-1 text-sm font-semibold">{edited.historicalSubmission.poleCondition}</p>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase text-yellow-600">Prev. Pad</p>
                <p className="mt-1 text-sm font-semibold">{edited.historicalSubmission.padCondition}</p>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase text-yellow-600">Prev. Veg</p>
                <p className="mt-1 text-sm font-semibold">{edited.historicalSubmission.vegetationEncroachment ? "Yes" : "No"}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  update("poleCondition", edited.historicalSubmission.poleCondition);
                  update("padCondition", edited.historicalSubmission.padCondition);
                  update("vegetationEncroachment", edited.historicalSubmission.vegetationEncroachment);
                }}
                className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-bold text-black shadow-sm transition hover:bg-yellow-300"
              >
                Copy Previous Values
              </button>
            </div>
          </div>
        )}

        {/* ── AI Annotated Images ── */}
        {(aiTagImg || aiOverviewImg) && (
          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-3">
              AI Annotated Images
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {aiTagImg && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-blue-700">Tag Analysis</span>
                  <button
                    onClick={() => setLightbox(aiTagImg)}
                    className="group relative overflow-hidden rounded-2xl ring-1 ring-blue-100 bg-blue-50 aspect-video"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={aiTagImg}
                      alt="AI tag analysis"
                      className="h-full w-full object-contain transition group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition">
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-blue-900 opacity-0 group-hover:opacity-100 transition">
                        Enlarge
                      </span>
                    </span>
                  </button>
                </div>
              )}
              {aiOverviewImg && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-blue-700">Pole Analysis</span>
                  <button
                    onClick={() => setLightbox(aiOverviewImg)}
                    className="group relative overflow-hidden rounded-2xl ring-1 ring-blue-100 bg-blue-50 aspect-video"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={aiOverviewImg}
                      alt="AI pole analysis"
                      className="h-full w-full object-contain transition group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition">
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-blue-900 opacity-0 group-hover:opacity-100 transition">
                        Enlarge
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Photo count summary ── */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["tag", "overview", "base", "pad"] as const).map((cat) => (
            <div
              key={cat}
              className="rounded-2xl bg-blue-50 px-5 py-4 text-center ring-1 ring-blue-100"
            >
              <p className="text-2xl font-extrabold text-blue-950">
                {edited.fileCounts[cat]}
              </p>
              <p className="mt-1 text-xs font-semibold capitalize text-blue-700">
                {cat} photo{edited.fileCounts[cat] !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>

        {/* ── AI-prefilled fields (all editable) ── */}
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <Field label="Tag Number" aiGenerated>
            <input
              type="text"
              value={edited.tagNumber}
              onChange={(e) => update("tagNumber", e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Pole Condition" aiGenerated>
            <select
              value={edited.poleCondition}
              onChange={(e) => update("poleCondition", e.target.value)}
              className="input"
            >
              {CONDITION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Pad-Mounted Equipment Condition" aiGenerated>
            <select
              value={edited.padCondition}
              onChange={(e) => update("padCondition", e.target.value)}
              className="input"
            >
              {CONDITION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>

          <Field label="Vegetation Encroachment" aiGenerated>
            <div className="flex gap-3">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  onClick={() => update("vegetationEncroachment", val)}
                  className={`flex-1 rounded-xl border py-3 text-sm font-bold transition-all ${
                    edited.vegetationEncroachment === val
                      ? val
                        ? "border-green-400 bg-green-100 text-green-900"
                        : "border-blue-400 bg-blue-100 text-blue-900"
                      : "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100"
                  }`}
                >
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Overview Notes" aiGenerated>
            <textarea
              rows={3}
              value={edited.overviewNotes}
              onChange={(e) => update("overviewNotes", e.target.value)}
              className="input resize-none"
            />
          </Field>

          <Field label="Base Notes" aiGenerated>
            <textarea
              rows={3}
              value={edited.baseNotes}
              onChange={(e) => update("baseNotes", e.target.value)}
              className="input resize-none"
            />
          </Field>
        </div>

        {/* ── Inspector flags ── */}
        <div className="mt-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-blue-500 mb-3">
            Inspector Flags
          </h2>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(FLAG_META) as [FlagKey, typeof FLAG_META[FlagKey]][]).map(
              ([key, meta]) => (
                <button
                  key={key}
                  onClick={() => toggleFlag(key)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold ring-1 transition-all ${
                    extraFlags.includes(key)
                      ? meta.color
                      : "border-blue-200 bg-blue-50 text-blue-900 ring-blue-100 hover:bg-blue-100"
                  }`}
                >
                  {extraFlags.includes(key) ? "✓ " : ""}
                  {meta.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* ── Diff notice ── */}
        {hasChanges && (
          <p className="mt-6 text-sm font-semibold text-yellow-600">
            ✎ You have made changes from the AI&apos;s original output.
          </p>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="mt-10 flex flex-wrap gap-4">
          <button
            onClick={() => router.push("/portal/submission")}
            disabled={saving || saved}
            className="rounded-xl bg-blue-50 px-7 py-3 text-sm font-bold text-blue-950 ring-1 ring-blue-200 transition hover:bg-blue-100 active:scale-[0.98] disabled:opacity-50"
          >
            ← Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || saved}
            className="rounded-xl bg-yellow-400 px-7 py-3 text-sm font-bold text-black shadow-sm transition-all hover:bg-yellow-300 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {saved ? "Saved! Redirecting…" : saving ? "Saving…" : "Confirm & Save →"}
          </button>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Enlarged AI result"
            className="max-h-full max-w-full rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white text-xl hover:bg-white/40"
          >
            ✕
          </button>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #172554;
          outline: none;
        }
        .input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 2px #dbeafe;
        }
      `}</style>
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

function FlagPill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${color}`}>
      {label}
    </span>
  );
}
