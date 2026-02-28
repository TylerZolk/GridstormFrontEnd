import RequireAuth from "@/components/RequireAuth";
import { getSessionUser } from "@/lib/auth";

export default async function PortalPage() {
  const user = await getSessionUser();

  return (
    <RequireAuth>
      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-8 py-16">
          {/* Outer card using shadow instead of border */}
          <div className="rounded-3xl bg-white p-14 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
            {/* Header */}
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-4xl font-bold text-blue-900">
                  Welcome, {user?.username}
                </h1>
                <p className="mt-4 text-lg text-blue-800">
                  Upload site photo sets below.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-blue-800">Role</span>
                <span className="rounded-full bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-900">
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Upload Section */}
            <div className="mt-16">
              <h2 className="text-2xl font-semibold text-blue-900">
                Photo Uploads
              </h2>
              <p className="mt-3 text-sm text-blue-800">
                Front-end fields only (no storage yet).
              </p>

              {/* Grid */}
              <div className="mt-12 grid gap-10 md:grid-cols-2">
                <UploadCard title="Tag Photo Close-Up" multiple={false} />
                <UploadCard title="Overview Photos" multiple />
                <UploadCard title="Base Photos" multiple />
                <UploadCard title="Pad Mounted Photos" multiple />
              </div>

              <div className="mt-14 rounded-2xl bg-blue-50 px-8 py-6 text-sm text-blue-900">
                <span className="font-semibold">Note:</span> Not stored yet. (UI
                only)
              </div>
            </div>
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}

function UploadCard({ title, multiple }: { title: string; multiple: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)]">
      <h3 className="text-xl font-semibold text-blue-900">{title}</h3>

      <label className="mt-8 block">
        {/* Bigger blue box + hover interaction */}
        <div className="min-h-[140px] cursor-pointer rounded-xl bg-blue-50 px-8 py-8 transition-all duration-200 hover:bg-blue-100 hover:shadow-inner">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-sm font-medium text-blue-900">
                {multiple ? "Select images" : "Select an image"}
              </div>

              <p className="mt-5 text-xs text-blue-800">
                {multiple
                  ? "You can select multiple images."
                  : "Select a single image."}
              </p>

              <p className="mt-3 text-xs text-blue-700">
                Accepted: JPG, PNG, WebP
              </p>
            </div>

            {/* Smaller button + real hover + pointer */}
            <span className="shrink-0 cursor-pointer rounded-md bg-white px-4 py-1.5 text-xs font-semibold text-blue-900 shadow-sm transition-all duration-150 hover:bg-blue-100 hover:shadow-md hover:scale-[1.03] active:scale-[0.98]">
              Browse
            </span>
          </div>
        </div>

        {/* input connected to label so click works */}
        <input type="file" accept="image/*" multiple={multiple} className="hidden" />
      </label>
    </div>
  );
}