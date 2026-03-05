import { getFiles } from "@/server-actions/get-files.action";
import FileListItem from "@/components/FileListItem";
import React from "react";
import FileUploader from "@/components/FileUploader";

export default async function ShcFiles() {
  const files = await getFiles();

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">My Files</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload, share, and manage your files from one place.
        </p>
      </header>

      <FileUploader />

      {files.results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
          No files yet. Upload your first file using the button above.
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[320px] px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Size
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
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
