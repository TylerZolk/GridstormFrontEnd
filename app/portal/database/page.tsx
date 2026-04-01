"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SubmissionFlag = "processing" | "vegetation" | "review";

type Submission = {
  id: string;
  createdAt: number;
  submittedBy: string;
  tagNumber: string;
  poleCondition: string;
  padCondition: string;
  overviewNotes: string;
  baseNotes: string;
  vegetationEncroachment: boolean;
  flags: SubmissionFlag[];
  photoUrls: { tag: string[]; overview: string[]; base: string[]; pad: string[] };
};

const CONDITION_COLORS: Record<string, string> = {
  Excellent: "bg-green-100 text-green-800",
  Good:      "bg-blue-100 text-blue-800",
  Fair:      "bg-yellow-100 text-yellow-800",
  Poor:      "bg-orange-100 text-orange-800",
  Critical:  "bg-red-100 text-red-800",
};

const FLAG_META: Record<SubmissionFlag, { label: string; color: string; emoji: string }> = {
  processing: { label: "Processing",  color: "bg-gray-100 text-gray-700 ring-gray-200",       emoji: "⏳" },
  vegetation: { label: "Vegetation",  color: "bg-green-100 text-green-800 ring-green-300",    emoji: "🌿" },
  review:     { label: "Review",      color: "bg-purple-100 text-purple-800 ring-purple-300", emoji: "🔍" },
};

function ConditionBadge({ value }: { value: string }) {
  const cls = CONDITION_COLORS[value] ?? "bg-gray-100 text-gray-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>{value || "—"}</span>;
}

function FlagBadge({ flag }: { flag: SubmissionFlag }) {
  const m = FLAG_META[flag];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${m.color}`}>{m.emoji} {m.label}</span>;
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DatabaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectId = searchParams.get("id");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [editedSelected, setEditedSelected] = useState<Submission | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [filterFlag, setFilterFlag] = useState<SubmissionFlag | "all">("all");
  const [searchTag, setSearchTag] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [resolving, setResolving] = useState(false);

  function closeModal() {
    setSelected(null);
    setIsEditing(false);
    if (searchParams.toString()) {
      router.replace("/portal/database", { scroll: false });
    }
  }

  async function resolveReviewFlag() {
    if (!editedSelected) return;
    setResolving(true);
    try {
      const newFlags = (editedSelected.flags || []).filter(f => f !== "review");
      
      const res = await fetch("/api/submissions/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: editedSelected.id, 
          flags: newFlags,
          poleCondition: editedSelected.poleCondition,
          padCondition: editedSelected.padCondition,
          vegetationEncroachment: editedSelected.vegetationEncroachment,
          overviewNotes: editedSelected.overviewNotes,
          baseNotes: editedSelected.baseNotes
        })
      });
      if (!res.ok) throw new Error("Failed to update submission");
      
      const updatedSubmission = { ...editedSelected, flags: newFlags };
      setSubmissions(prev => prev.map(s => s.id === updatedSubmission.id ? updatedSubmission : s));
      setSelected(updatedSubmission);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setResolving(false);
    }
  }

  useEffect(() => {
    fetch("/api/submissions/list")
      .then(async (r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        return data;
      })
      .then((data) => { 
        if (data) {
          const list = data.submissions ?? [];
          setSubmissions(list);
          if (preselectId) {
            const found = list.find((s: Submission) => s.id === preselectId);
            if (found) {
              setSelected(found);
              setEditedSelected(found);
            }
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router, preselectId]);

  // Unique users for dropdown
  const uniqueUsers = useMemo(() => {
    const users = [...new Set(submissions.map((s) => s.submittedBy))].sort();
    return users;
  }, [submissions]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (filterFlag !== "all" && !s.flags?.includes(filterFlag)) return false;
      if (searchTag.trim() && !s.tagNumber?.toLowerCase().includes(searchTag.trim().toLowerCase())) return false;
      if (searchUser && s.submittedBy !== searchUser) return false;
      return true;
    });
  }, [submissions, filterFlag, searchTag, searchUser]);

  const allPhotos = selected ? [
    ...(selected.photoUrls?.tag ?? []).map((u) => ({ url: u, cat: "Tag" })),
    ...(selected.photoUrls?.overview ?? []).map((u) => ({ url: u, cat: "Overview" })),
    ...(selected.photoUrls?.base ?? []).map((u) => ({ url: u, cat: "Base" })),
    ...(selected.photoUrls?.pad ?? []).map((u) => ({ url: u, cat: "Pad" })),
  ] : [];

  const hasActiveSearch = searchTag.trim() || searchUser;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="rounded-3xl bg-white p-10 shadow-lg">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-blue-950">Submission Database</h1>
            <p className="mt-1 text-blue-900/70">All confirmed inspection reports, newest first.</p>
          </div>
          <span className="rounded-2xl bg-blue-50 px-5 py-2 text-sm font-bold text-blue-900 ring-1 ring-blue-100">
            {filtered.length} / {submissions.length} record{submissions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Search Bar */}
        <div className="mt-6 flex flex-wrap gap-3">
          {/* Tag search */}
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 flex-1 min-w-[180px]">
            <span className="text-blue-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by tag number…"
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              className="bg-transparent text-sm text-blue-900 placeholder:text-blue-400 outline-none w-full"
            />
            {searchTag && (
              <button onClick={() => setSearchTag("")} className="text-blue-400 hover:text-blue-600 text-xs font-bold cursor-pointer">✕</button>
            )}
          </div>

          {/* User filter */}
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 min-w-[180px] cursor-pointer">
            <span className="text-blue-400 text-sm">👤</span>
            <select
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="bg-transparent text-sm text-blue-900 outline-none w-full cursor-pointer"
            >
              <option value="">All inspectors</option>
              {uniqueUsers.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Clear all */}
          {hasActiveSearch && (
            <button
              onClick={() => { setSearchTag(""); setSearchUser(""); }}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Flag Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "vegetation", "review", "processing"] as const).map((f) => (
            <button key={f} onClick={() => setFilterFlag(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold ring-1 transition-all cursor-pointer ${
                filterFlag === f ? "bg-blue-600 text-white ring-blue-600" : "bg-blue-50 text-blue-800 ring-blue-200 hover:bg-blue-100"
              }`}>
              {f === "all" ? "All flags" : `${FLAG_META[f].emoji} ${FLAG_META[f].label}`}
            </button>
          ))}
        </div>

        {/* Active search notice */}
        {hasActiveSearch && (
          <div className="mt-3 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
            Showing {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            {searchTag && <> matching tag "<span className="font-bold">{searchTag}</span>"</>}
            {searchUser && <> by <span className="font-bold">{searchUser}</span></>}
          </div>
        )}

        {loading && <div className="mt-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /></div>}
        {error && <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-6xl">{hasActiveSearch ? "🔍" : "📋"}</p>
            <p className="mt-4 text-xl font-bold text-blue-950">
              {hasActiveSearch ? "No matching submissions found" : filterFlag !== "all" ? "No submissions with this flag" : "No submissions yet"}
            </p>
            {hasActiveSearch && (
              <button onClick={() => { setSearchTag(""); setSearchUser(""); }} className="mt-3 text-sm font-semibold text-blue-500 hover:underline cursor-pointer">
                Clear search
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="mt-8 overflow-x-auto rounded-2xl ring-1 ring-blue-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-700">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Tag #</th>
                  <th className="px-5 py-3">By</th>
                  <th className="px-5 py-3">Pole</th>
                  <th className="px-5 py-3">Pad</th>
                  <th className="px-5 py-3">Vegetation</th>
                  <th className="px-5 py-3">Flags</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200">
                {filtered.map((s) => (
                  <tr key={s.id} className="cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => { setSelected(s); setEditedSelected(s); setIsEditing(false); }}>
                    <td className="px-5 py-3 text-blue-900/70 whitespace-nowrap">{formatDate(s.createdAt)}</td>
                    <td className="px-5 py-3 font-bold text-blue-950">{s.tagNumber || "—"}</td>
                    <td className="px-5 py-3 text-blue-900/80">{s.submittedBy}</td>
                    <td className="px-5 py-3"><ConditionBadge value={s.poleCondition} /></td>
                    <td className="px-5 py-3"><ConditionBadge value={s.padCondition} /></td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.vegetationEncroachment ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                        {s.vegetationEncroachment ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(s.flags ?? []).length === 0 ? <span className="text-blue-300 text-xs">—</span> : (s.flags ?? []).map((f) => <FlagBadge key={f} flag={f} />)}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-xl bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-900 ring-1 ring-blue-300 transition-colors hover:bg-blue-200 cursor-pointer">
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

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-blue-950">Tag #{selected.tagNumber || "—"}</h2>
                <p className="text-sm text-blue-900/60">{formatDate(selected.createdAt)} · {selected.submittedBy}</p>
              </div>
              <button onClick={closeModal} className="rounded-full bg-blue-50 p-2 text-blue-900 hover:bg-blue-100 cursor-pointer">✕</button>
            </div>

            {(selected.flags ?? []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">{(selected.flags ?? []).map((f) => <FlagBadge key={f} flag={f} />)}</div>
            )}

            <div className="mt-6 grid grid-cols-3 gap-4">
              <Detail label="Pole Condition">
                {isEditing ? (
                  <select
                    value={editedSelected?.poleCondition}
                    onChange={(e) => setEditedSelected(prev => prev ? { ...prev, poleCondition: e.target.value } : prev)}
                    className="w-full rounded-md border border-blue-200 bg-white text-sm text-blue-950 p-1.5 outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {["Excellent", "Good", "Fair", "Poor", "Critical"].map(c => <option key={c}>{c}</option>)}
                  </select>
                ) : (
                  <ConditionBadge value={selected.poleCondition} />
                )}
              </Detail>
              <Detail label="Pad Condition">
                {isEditing ? (
                  <select
                    value={editedSelected?.padCondition}
                    onChange={(e) => setEditedSelected(prev => prev ? { ...prev, padCondition: e.target.value } : prev)}
                    className="w-full rounded-md border border-blue-200 bg-white text-sm text-blue-950 p-1.5 outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {["Excellent", "Good", "Fair", "Poor", "Critical"].map(c => <option key={c}>{c}</option>)}
                  </select>
                ) : (
                  <ConditionBadge value={selected.padCondition} />
                )}
              </Detail>
              <Detail label="Vegetation">
                {isEditing ? (
                  <select
                    value={editedSelected?.vegetationEncroachment ? "Yes" : "No"}
                    onChange={(e) => setEditedSelected(prev => prev ? { ...prev, vegetationEncroachment: e.target.value === "Yes" } : prev)}
                    className="w-full rounded-md border border-blue-200 bg-white text-sm text-blue-950 p-1.5 outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                ) : (
                  <span className={`font-bold ${selected.vegetationEncroachment ? "text-green-700" : "text-blue-950"}`}>
                    {selected.vegetationEncroachment ? "Yes" : "No"}
                  </span>
                )}
              </Detail>
            </div>

            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Overview Notes</p>
              {isEditing ? (
                <textarea
                  value={editedSelected?.overviewNotes ?? ""}
                  onChange={(e) => setEditedSelected(prev => prev ? { ...prev, overviewNotes: e.target.value } : prev)}
                  className="mt-1 w-full rounded-md border border-blue-200 bg-white p-2 text-sm text-blue-950 outline-none focus:ring-2 focus:ring-blue-300"
                  rows={3}
                />
              ) : (
                selected.overviewNotes ? (
                  <p className="mt-1 text-sm text-blue-900">{selected.overviewNotes}</p>
                ) : (
                  <p className="mt-1 text-sm text-blue-400 italic">No overview notes.</p>
                )
              )}
            </div>
            
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-500">Base Notes</p>
              {isEditing ? (
                <textarea
                  value={editedSelected?.baseNotes ?? ""}
                  onChange={(e) => setEditedSelected(prev => prev ? { ...prev, baseNotes: e.target.value } : prev)}
                  className="mt-1 w-full rounded-md border border-blue-200 bg-white p-2 text-sm text-blue-950 outline-none focus:ring-2 focus:ring-blue-300"
                  rows={3}
                />
              ) : (
                selected.baseNotes ? (
                  <p className="mt-1 text-sm text-blue-900">{selected.baseNotes}</p>
                ) : (
                  <p className="mt-1 text-sm text-blue-400 italic">No base notes.</p>
                )
              )}
            </div>

            {allPhotos.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-3">Photos</p>
                <div className="grid grid-cols-3 gap-2">
                  {allPhotos.map(({ url, cat }, i) => (
                    <button key={i} onClick={() => setLightbox(url)} className="group relative overflow-hidden rounded-xl aspect-square bg-blue-50 cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={cat} className="h-full w-full object-cover transition group-hover:scale-105" />
                      <span className="absolute bottom-1 left-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white font-semibold">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allPhotos.length === 0 && (
              <p className="mt-6 text-xs text-blue-400 italic">No photos stored for this submission.</p>
            )}

            <div className="mt-8 flex gap-3 flex-wrap">
              {selected.flags?.includes("review") && (
                <>
                  {!isEditing ? (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="flex-1 rounded-xl bg-blue-100 py-3 text-sm font-bold text-blue-900 ring-1 ring-blue-300 hover:bg-blue-200 cursor-pointer"
                    >
                      Edit Data
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-200 cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button 
                    onClick={resolveReviewFlag} 
                    disabled={resolving}
                    className="flex-1 rounded-xl bg-purple-100 py-3 text-sm font-bold text-purple-800 ring-1 ring-purple-300 hover:bg-purple-200 disabled:opacity-50 cursor-pointer"
                  >
                    {resolving ? "Saving..." : (isEditing ? "Save & Resolve" : "Mark Review Resolved")}
                  </button>
                </>
              )}
              <button onClick={closeModal} className="flex-1 rounded-xl bg-blue-50 py-3 text-sm font-bold text-blue-950 ring-1 ring-blue-200 hover:bg-blue-100 cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Photo" className="max-h-full max-w-full rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white text-xl hover:bg-white/40 cursor-pointer">✕</button>
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

export default function DatabasePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-blue-900 font-bold">Loading database...</div>}>
      <DatabaseContent />
    </Suspense>
  );
}
