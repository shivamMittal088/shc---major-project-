import { getFiles } from "@/server-actions/get-files.action";
import FileListItem from "@/components/FileListItem";
import React from "react";
import FileUploader from "@/components/FileUploader";

export default async function ShcFiles() {
  const files = await getFiles();

  return (
    <div className="space-y-3">
      <header className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">My Files</h1>
        <p className="mt-0.5 text-xs text-slate-600">
          Upload, share, and manage your files from one place.
        </p>
      </header>

      <FileUploader />

      {files.results.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-xs text-slate-600">
          No files yet. Upload your first file using the button above.
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[260px] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Size
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {files.results.map((file) => (
                <React.Fragment key={file.id}>
                  <FileListItem file={file} />
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
