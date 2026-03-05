"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
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
    <div className="mb-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">Upload File</h2>
        <p className="text-xs text-slate-600">
          Choose a file to upload to your account.
        </p>
      </div>

      <div className="flex items-center gap-3">
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
          className="h-8 bg-slate-900 px-3 text-xs font-semibold hover:bg-slate-800"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
              Upload
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
