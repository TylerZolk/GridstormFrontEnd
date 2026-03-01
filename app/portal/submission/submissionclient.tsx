"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type UploadSlot = {
  key: string;
  title: string;
  help: string;
  multiple: boolean;
};

const SLOTS: UploadSlot[] = [
  { key: "tag",      title: "Tag Photo Close-Up",  help: "Single image of the tag.",        multiple: false },
  { key: "overview", title: "Overview Photos",      help: "Wide shots of the full site.",     multiple: true  },
  { key: "base",     title: "Base Photos",          help: "Photos of the pole base.",         multiple: true  },
  { key: "pad",      title: "Pad Mounted Photos",   help: "Photos of pad-mounted equipment.", multiple: true  },
];

export default function SubmissionClient() {
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);

    const tagFile = files["tag"]?.[0];

    const mockResult = {
      tagNumber:     tagFile ? "TAG-" + Math.floor(Math.random() * 90000 + 10000) : "UNKNOWN",
      poleCondition: "Good",
      padCondition:  "Fair",
      overviewNotes: "No visible structural damage detected.",
      baseNotes:     "Minor surface rust on lower 12 inches.",
      confidence:    87,
      fileCounts: {
        tag:      (files["tag"]      ?? []).length,
        overview: (files["overview"] ?? []).length,
        base:     (files["base"]     ?? []).length,
        pad:      (files["pad"]      ?? []).length,
      },
    };

    sessionStorage.setItem("submissionReview", JSON.stringify(mockResult));
    router.push("/portal/submission/review");
  }

  const totalFiles = Object.values(files).flat().length;

  return (
    <div className="mt-8 flex flex-col gap-8">
      <div className="grid gap-8 md:grid-cols-2">
        {SLOTS.map((slot) => (
          <UploadCard
            key={slot.key}
            slot={slot}
            selectedFiles={files[slot.key] ?? []}
            onFiles={(f) => handleFiles(slot.key, f, slot.multiple)}
            onRemove={(i) => removeFile(slot.key, i)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-6 py-4 ring-1 ring-blue-200">
        <p className="text-sm text-blue-900">
          {totalFiles === 0
            ? "No files selected yet."
            : `${totalFiles} file${totalFiles !== 1 ? "s" : ""} ready to submit.`}
        </p>
        <button
          onClick={handleSubmit}
          disabled={totalFiles === 0 || submitting}
          className="rounded-xl bg-yellow-400 px-7 py-3 text-sm font-bold text-black shadow-sm transition-all duration-150 hover:bg-yellow-300 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Analysing…" : "Submit & Review →"}
        </button>
      </div>
    </div>
  );
}

function UploadCard({
  slot,
  selectedFiles,
  onFiles,
  onRemove,
}: {
  slot: UploadSlot;
  selectedFiles: File[];
  onFiles: (f: FileList | null) => void;
  onRemove: (i: number) => void;
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
            onClick={() => inputRef.current?.click()}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-white px-5 py-2 text-sm font-bold text-blue-950 shadow-sm ring-1 ring-blue-200 transition hover:shadow-md hover:ring-blue-300 active:scale-[0.98]"
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
                  className="ml-3 text-xs font-semibold text-red-400 hover:text-red-600"
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