"use client";

import { useState } from "react";
import { FileIcon, defaultStyles } from "react-file-icon";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { dayjs } from "@/lib/dayjs";
import { formatBytes } from "@/lib/utils";
import { ShcFile } from "@/types/file.type";
import { toast } from "sonner";
import { toggleFileVisibility } from "@/server-actions/toggle-file-visibility.action";
import { removeFile } from "@/server-actions/remove-file.action";
import { Copy, Eye, Lock, Unlock, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

export default function FileListItem({
  file,
}: {
  file: Omit<ShcFile, "download_url">;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState<boolean>(file.is_public);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState<boolean>(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  async function toggleVisibility() {
    setIsPublic((prev) => !prev);
    try {
      setIsVisibilityLoading(true);
      await toggleFileVisibility(file.id);
    } catch (error) {
      setIsPublic((prev) => !prev);
      toast.error("Something went wrong!");
    } finally {
      setIsVisibilityLoading(false);
    }
  }

  async function deleteCurrentFile() {
    try {
      setIsDeleteLoading(true);
      await removeFile(file.id);
      toast.success("File deleted");
      setIsDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to delete file");
      }
    } finally {
      setIsDeleteLoading(false);
    }
  }

  return (
    <tr className="hover:bg-slate-50/70">
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 shrink-0">
            <FileIcon
              extension={file.extension}
              {...defaultStyles[file.extension]}
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium leading-4 text-slate-900">
              {file.name}
            </p>
            <p className="text-[9px] uppercase leading-4 tracking-wide text-slate-500">
              .{file.extension || "file"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-[11px] text-slate-600">
        <p>{dayjs(file.updated_at).fromNow()}</p>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-[11px] font-medium text-slate-700">
        <p>{formatBytes(file.size)}</p>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right">
        <div className="flex flex-wrap justify-end gap-1">
          <Button
            className="h-6 w-6 bg-emerald-600 p-0 text-white hover:bg-emerald-500"
            onClick={() => {
              navigator.clipboard.writeText(`${location.origin}/share/${file.id}`);
              toast.success("Link copied to clipboard!");
            }}
            size="icon"
            title="Copy share link"
            aria-label={`Copy link for ${file.name}`}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Link href={`/share/${file.id}`}>
            <Button
              className="h-6 w-6 bg-sky-600 p-0 text-white hover:bg-sky-500"
              size="icon"
              title="Open shared view"
              aria-label={`Open ${file.name}`}
            >
              <Eye className="h-3 w-3" />
            </Button>
          </Link>
          <Button
            size="sm"
            className={`h-6 px-2 text-[10px] font-semibold text-white ${
              isPublic ? "bg-amber-500 hover:bg-amber-400" : "bg-slate-700 hover:bg-slate-600"
            }`}
            onClick={toggleVisibility}
            disabled={isVisibilityLoading || isDeleteLoading}
            title={isPublic ? "Make private" : "Make public"}
          >
            {isPublic ? (
              <>
                <Unlock className="mr-1 h-3 w-3" /> Public
              </>
            ) : (
              <>
                <Lock className="mr-1 h-3 w-3" /> Private
              </>
            )}
          </Button>
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                aria-label={`Delete ${file.name}`}
                title="Delete file"
                className="h-6 w-6 bg-rose-600 text-white hover:bg-rose-500"
                disabled={isDeleteLoading || isVisibilityLoading}
              >
                <X className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete file?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {file.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleteLoading}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-rose-600 text-white hover:bg-rose-500"
                  disabled={isDeleteLoading}
                  onClick={(event) => {
                    event.preventDefault();
                    void deleteCurrentFile();
                  }}
                >
                  {isDeleteLoading ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </td>
    </tr>
  );
}
