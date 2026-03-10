"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addFile } from "@/server-actions/add-file.action";
import { updateFileUploadStatus } from "@/server-actions/update-file-upload-status.action";

const DEFAULT_MIME_TYPE = "application/octet-stream";

export default function FileUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    let fileId: string | null = null;
    const mimeType = file.type || DEFAULT_MIME_TYPE;

    setIsUploading(true);

    try {
      const addResponse = await addFile({
        file_name: file.name,
        file_size: file.size,
        mime_type: mimeType,
      });

      fileId = addResponse.file_id;
      await updateFileUploadStatus(fileId, "uploading");

      const uploadResponse = await fetch(addResponse.upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      await updateFileUploadStatus(fileId, "uploaded");
      toast.success("File uploaded successfully");
      router.refresh();
    } catch (error) {
      if (fileId) {
        try {
          await updateFileUploadStatus(fileId, "failed");
        } catch {
          // Best effort rollback status update.
        }
      }

      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to upload file");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-br from-cyan-500/10 via-white/[0.04] to-indigo-500/10 px-4 py-3.5 shadow-[0_24px_72px_-56px_rgba(56,189,248,0.8)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_55%)]" />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/10 px-2.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-cyan-100">
            <UploadCloud className="h-3 w-3" />
            Upload flow
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white">Ship a new snippet bundle</h2>
            <p className="mt-0.5 max-w-2xl text-[11px] text-slate-300">
              Upload source files, docs, or binaries and instantly generate a shareable link for your team.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <Button
          onClick={handleUploadClick}
          disabled={isUploading}
          className="h-9 rounded-full border border-cyan-300/20 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 px-4 text-[11px] font-semibold text-slate-950 shadow-[0_18px_36px_-22px_rgba(56,189,248,0.95)] transition-all hover:shadow-[0_22px_44px_-18px_rgba(56,189,248,0.95)]"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
              Select file
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
      </div>
    </motion.div>
  );
}
