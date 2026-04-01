"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type UploadSlot = { key: string; title: string; help: string; multiple: boolean };

const SLOTS: UploadSlot[] = [
  { key: "tag",      title: "Tag Photo Close-Up",  help: "Single image of the tag.",        multiple: false },
  { key: "overview", title: "Overview Photos",      help: "Wide shots of the full site.",     multiple: true  },
  { key: "base",     title: "Base Photos",          help: "Photos of the pole base.",         multiple: true  },
  { key: "pad",      title: "Pad Mounted Photos",   help: "Photos of pad-mounted equipment.", multiple: true  },
];

type SubmitStage =
  | "idle"
  | "uploading"
  | "analysing_tag"
  | "analysing_pole"
  | "done";

const STAGE_LABEL: Record<SubmitStage, string> = {
  idle:          "Submit & Analyse →",
  uploading:     "Uploading photos…",
  analysing_tag: "AI: Reading asset tag…",
  analysing_pole:"AI: Analysing pole…",
  done:          "Done!",
};

// ── helpers ──────────────────────────────────────────────────────────────────

const MAX_AI_SIZE = 4 * 1024 * 1024; // 4 MB — stays under Vercel 4.5 MB request limit

/**
 * Compress an image client-side using canvas.
 * Returns the file as-is if it's already under maxSizeBytes.
 */
async function compressImage(file: File, maxSizeBytes: number): Promise<File> {
  if (file.size <= maxSizeBytes) return file;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  // Scale down large images to max 2048px on longest side
  const maxDim = 2048;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Try decreasing quality until under limit
  for (let q = 0.8; q >= 0.2; q -= 0.1) {
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
        "image/jpeg",
        q
      )
    );
    if (blob.size <= maxSizeBytes) {
      return new File([blob], file.name, { type: "image/jpeg" });
    }
  }

  // Lowest quality fallback
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      "image/jpeg",
      0.1
    )
  );
  return new File([blob], file.name, { type: "image/jpeg" });
}



/** POST a single file to a PolePad AI endpoint via the Next.js proxy, compressing first. */
async function callPolePadEndpoint(
  path: string,
  file: File
): Promise<Record<string, unknown>> {
  // Compress for the AI proxy to stay under Vercel's body limit
  const compressed = await compressImage(file, MAX_AI_SIZE);

  const fd = new FormData();
  fd.append("file", compressed);

  // Route through Next.js proxy — avoids Cloudflare browser challenge
  const proxyPath = "/api/polepad" + path;
  const res = await fetch(proxyPath, { method: "POST", body: fd });

  if (!res.ok) throw new Error(`PolePad proxy error ${res.status} on ${path}`);
  const json = await res.json();
  if (json?.error) throw new Error(`PolePad returned error: ${json.error}`);
  return json;
}


// ── component ─────────────────────────────────────────────────────────────────

export default function SubmissionClient() {
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [stage, setStage] = useState<SubmitStage>("idle");
  const [error, setError] = useState<string | null>(null);

  function handleFiles(key: string, selected: FileList | null, multiple: boolean) {
    if (!selected) return;
    const arr = Array.from(selected);
    setFiles((prev) => ({
      ...prev,
      [key]: multiple ? [...(prev[key] ?? []), ...arr] : [arr[0]],
    }));
  }

  function removeFile(key: string, index: number) {
    setFiles((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit() {
    setError(null);

    try {
      // ── 1. Upload all photos directly to S3 via presigned URLs ─────────
      setStage("uploading");

      // Build the list of files to request presigned URLs for
      const fileList: { category: string; contentType: string; filename: string; file: File }[] = [];
      for (const [cat, arr] of Object.entries(files)) {
        for (const f of arr) {
          fileList.push({
            category: cat,
            contentType: f.type || "image/jpeg",
            filename: f.name,
            file: f,
          });
        }
      }

      // Request presigned PUT URLs from the server (tiny JSON request)
      const presignRes = await fetch("/api/submissions/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: fileList.map(({ category, contentType, filename }) => ({
            category,
            contentType,
            filename,
          })),
        }),
      });
      const presignJson = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignJson?.error ?? "Failed to get upload URLs");

      const uploads: { category: string; key: string; putUrl: string; getUrl: string }[] =
        presignJson.uploads;

      // Upload each file directly to S3 via presigned PUT URL (no Vercel involved)
      await Promise.all(
        uploads.map(async (upload, i) => {
          const file = fileList[i].file;
          const res = await fetch(upload.putUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type || "image/jpeg" },
            body: file,
          });
          if (!res.ok) {
            throw new Error(`S3 upload failed for ${file.name} (HTTP ${res.status})`);
          }
        })
      );

      // Organize the GET URLs by category
      const photoUrls: Record<string, string[]> = { tag: [], overview: [], base: [], pad: [] };
      for (const upload of uploads) {
        photoUrls[upload.category].push(upload.getUrl);
      }

      // ── 2. Analyse asset tag ─────────────────────────────────────────────
      setStage("analysing_tag");

      let tagNumber = "UNKNOWN";
      let tagImageBase64: string | undefined;
      let tagDetectionStatus: string | undefined;
      let tagVegPct = 0;

      const tagFile = files["tag"]?.[0];
      if (tagFile) {
        try {
          const tagResult = await callPolePadEndpoint(
            "/api1/analyze-asset-tag/",
            tagFile
          );

          tagNumber          = (tagResult.asset_id as string) ?? "UNKNOWN";
          tagVegPct          = ((tagResult.vegetation_percent as number) ?? 0) * 100;
          tagImageBase64     = tagResult.image_base64 as string | undefined;
          tagDetectionStatus = tagResult.detection_status as string | undefined;
        } catch (e) {
          // Non-fatal: fall back gracefully so the inspector can fill it in
          console.warn("Tag analysis failed:", e);
          tagNumber = "UNREADABLE";
        }
      }

      // ── 3. Analyse pole (uses first overview photo if available) ─────────
      setStage("analysing_pole");

      let poleVegPct = 0;
      let poleFlagged = false;
      let poleImageBase64: string | undefined;
      let poleDetectionStatus: string | undefined;
      let poleCondition = "Good";

      const overviewFile = files["overview"]?.[0];
      if (overviewFile) {
        try {
          const poleResult = await callPolePadEndpoint(
            "/api2/analyze-pole/",
            overviewFile
          );

          poleVegPct          = ((poleResult.vegetation_percent as number) ?? 0) * 100;
          poleFlagged         = (poleResult.flagged as boolean) ?? false;
          poleImageBase64     = poleResult.image_base64 as string | undefined;
          poleDetectionStatus = poleResult.detection_status as string | undefined;
        } catch (e) {
          console.warn("Pole analysis failed:", e);
        }
      }

      // ── 3.5 Fetch historical data if tag found ────────────────────────
      let historicalSubmission = null;
      if (tagNumber !== "UNKNOWN" && tagNumber !== "UNREADABLE") {
        try {
          const histRes = await fetch(`/api/submissions/by-tag?tag=${encodeURIComponent(tagNumber)}`);
          if (histRes.ok) {
            const histJson = await histRes.json();
            if (histJson.submission) {
              historicalSubmission = histJson.submission;
              poleCondition = historicalSubmission.poleCondition; // Inherit condition
            }
          }
        } catch (e) {
          console.warn("History fetch failed:", e);
        }
      }

      // ── 4. Build review payload and hand off ────────────────────────────
      setStage("done");

      const vegetationEncroachment = poleFlagged || tagVegPct >= 35 || poleVegPct >= 35;

      const reviewPayload = {
        tagNumber,
        poleCondition,
        padCondition: historicalSubmission?.padCondition || "Fair",
        overviewNotes: poleDetectionStatus
          ? `Pole detection: ${poleDetectionStatus}. Vegetation: ${poleVegPct.toFixed(1)}%.`
          : "No pole analysis available.",
        baseNotes: tagDetectionStatus
          ? `Tag detection: ${tagDetectionStatus}. Vegetation around tag: ${tagVegPct.toFixed(1)}%.`
          : "",
        vegetationEncroachment,

        // Counts for the review summary cards
        fileCounts: {
          tag:      (files["tag"]      ?? []).length,
          overview: (files["overview"] ?? []).length,
          base:     (files["base"]     ?? []).length,
          pad:      (files["pad"]      ?? []).length,
        },

        // Presigned GET URLs for DB storage
        photoUrls,

        // AI-generated annotated images (passed through for display on review)
        aiImages: {
          tag:      tagImageBase64,
          overview: poleImageBase64,
        },
        historicalSubmission, // Pass historical data to the review page
      };

      sessionStorage.setItem("submissionReview", JSON.stringify(reviewPayload));
      router.push("/portal/submission/review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("idle");
    }
  }

  const totalFiles = Object.values(files).flat().length;
  const busy = stage !== "idle";

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* Upload cards */}
      <div className="grid gap-8 md:grid-cols-2">
        {SLOTS.map((slot) => (
          <UploadCard
            key={slot.key}
            slot={slot}
            selectedFiles={files[slot.key] ?? []}
            onFiles={(f) => handleFiles(slot.key, f, slot.multiple)}
            onRemove={(i) => removeFile(slot.key, i)}
            disabled={busy}
          />
        ))}
      </div>

      {/* AI backend notice */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-800">
        <span className="font-semibold">PolePad AI</span> will read the asset
        tag and analyse vegetation coverage. Results are pre-filled on the next
        screen — you can correct anything before saving.
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stage progress indicator */}
      {busy && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-yellow-400 border-t-yellow-800" />
            <span className="text-sm font-semibold text-yellow-900">
              {STAGE_LABEL[stage]}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            {(["uploading", "analysing_tag", "analysing_pole", "done"] as SubmitStage[]).map(
              (s) => {
                const stageOrder = ["uploading", "analysing_tag", "analysing_pole", "done"];
                const currentIdx = stageOrder.indexOf(stage);
                const thisIdx    = stageOrder.indexOf(s);
                const done       = thisIdx < currentIdx;
                const active     = thisIdx === currentIdx;
                return (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                      done   ? "bg-yellow-400" :
                      active ? "bg-yellow-300 animate-pulse" :
                               "bg-blue-100"
                    }`}
                  />
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Submit bar */}
      <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-6 py-4 ring-1 ring-blue-200">
        <p className="text-sm text-blue-900">
          {totalFiles === 0
            ? "No files selected yet."
            : `${totalFiles} file${totalFiles !== 1 ? "s" : ""} ready — AI analysis runs on submit.`}
        </p>
        <button
          onClick={handleSubmit}
          disabled={totalFiles === 0 || busy}
          className="rounded-xl bg-yellow-400 px-7 py-3 text-sm font-bold text-black shadow-sm transition-all duration-150 hover:bg-yellow-300 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {STAGE_LABEL[stage]}
        </button>
      </div>
    </div>
  );
}

// ── UploadCard ────────────────────────────────────────────────────────────────

function UploadCard({
  slot,
  selectedFiles,
  onFiles,
  onRemove,
  disabled,
}: {
  slot: UploadSlot;
  selectedFiles: File[];
  onFiles: (f: FileList | null) => void;
  onRemove: (i: number) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-blue-100">
      <h3 className="text-2xl font-extrabold text-blue-950">{slot.title}</h3>
      <div className="mt-6 rounded-2xl bg-blue-50 p-6 ring-1 ring-blue-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="text-sm font-semibold text-blue-950">
            {slot.multiple ? "Select images" : "Select an image"}
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-white px-5 py-2 text-sm font-bold text-blue-950 shadow-sm ring-1 ring-blue-200 transition hover:shadow-md hover:ring-blue-300 active:scale-[0.98] disabled:opacity-50"
          >
            Browse
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple={slot.multiple}
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
        <p className="mt-4 text-sm text-blue-900/80">{slot.help}</p>
        <p className="mt-1 text-xs text-blue-900/60">Accepted: JPG, PNG, WebP</p>

        {/* Tag slot: remind user this drives the AI OCR */}
        {slot.key === "tag" && (
          <p className="mt-2 text-xs font-semibold text-yellow-700">
            ⚡ This photo is sent to AI for tag ID &amp; vegetation analysis.
          </p>
        )}
        {slot.key === "overview" && (
          <p className="mt-2 text-xs font-semibold text-yellow-700">
            ⚡ First overview photo is sent to AI for pole vegetation analysis.
          </p>
        )}

        {selectedFiles.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {selectedFiles.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-2 text-sm text-blue-950 ring-1 ring-blue-100"
              >
                <span className="truncate max-w-[200px]">{f.name}</span>
                <button
                  onClick={() => onRemove(i)}
                  disabled={disabled}
                  className="ml-3 text-xs font-semibold text-red-400 hover:text-red-600 disabled:opacity-40"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
