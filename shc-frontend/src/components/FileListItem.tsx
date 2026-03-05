"use client";

import { useState } from "react";
import { FileIcon, defaultStyles } from "react-file-icon";
import Link from "next/link";

import { dayjs } from "@/lib/dayjs";
import { formatBytes } from "@/lib/utils";
import { ShcFile } from "@/types/file.type";
import { toast } from "sonner";
import { toggleFileVisibility } from "@/server-actions/toggle-file-visibility.action";
import { Copy, Eye, Lock, Unlock } from "lucide-react";
import { Button } from "./ui/button";

export default function FileListItem({
  file,
}: {
  file: Omit<ShcFile, "download_url">;
}) {
  const [isPublic, setIsPublic] = useState<boolean>(file.is_public);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function toggleVisibility() {
    setIsPublic((prev) => !prev);
    try {
      setIsLoading(true);
      await toggleFileVisibility(file.id);
    } catch (error) {
      setIsPublic((prev) => !prev);
      toast.error("Something went wrong!");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <tr className="hover:bg-slate-50/70">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8">
            <FileIcon
              extension={file.extension}
              {...defaultStyles[file.extension]}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{file.name}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">.{file.extension || "file"}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
        <p>{dayjs(file.updated_at).fromNow()}</p>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
        <p>{formatBytes(file.size)}</p>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            className="h-8 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500"
            onClick={() => {
              navigator.clipboard.writeText(`${location.origin}/share/${file.id}`);
              toast.success("Link copied to clipboard!");
            }}
            size="shc"
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy link
          </Button>
          <Link href={`/share/${file.id}`}>
            <Button
              className="h-8 bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-500"
              size="shc"
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              View
            </Button>
          </Link>
          <Button
            size="shc"
            className={`h-8 px-3 text-xs font-semibold text-white ${
              isPublic ? "bg-amber-500 hover:bg-amber-400" : "bg-slate-700 hover:bg-slate-600"
            }`}
            onClick={toggleVisibility}
            disabled={isLoading}
          >
            {isPublic ? (
              <>
                <Unlock className="mr-1.5 h-3.5 w-3.5" /> Public
              </>
            ) : (
              <>
                <Lock className="mr-1.5 h-3.5 w-3.5" /> Private
              </>
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}
