"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileIcon, defaultStyles } from "react-file-icon";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { dayjs } from "@/lib/dayjs";
import { formatBytes } from "@/lib/utils";
import { ShcFile } from "@/types/file.type";
import { toast } from "sonner";
import { toggleFileVisibility } from "@/server-actions/toggle-file-visibility.action";
import { removeFile } from "@/server-actions/remove-file.action";
import { renameFile } from "@/server-actions/rename-file.action";
import {
  CalendarDays,
  Check,
  Copy,
  Eye,
  FileCode2,
  Lock,
  Pencil,
  Sparkles,
  Unlock,
  X,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  formatStatusLabel,
  getLanguageLabel,
  getLanguageTone,
  getStatusTone,
} from "@/lib/file-presentation";

export default function FileListItem({
  file,
  index = 0,
}: {
  file: Omit<ShcFile, "download_url">;
  index?: number;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState<boolean>(file.is_public);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState<boolean>(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState<boolean>(false);
  const [isRenameLoading, setIsRenameLoading] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>(file.name);

  const languageLabel = getLanguageLabel(file.extension);

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

  async function renameCurrentFile() {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      toast.error("File name is required");
      return;
    }

    try {
      setIsRenameLoading(true);
      await renameFile(file.id, trimmedName);
      toast.success("File renamed");
      setIsRenameDialogOpen(false);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to rename file");
      }
    } finally {
      setIsRenameLoading(false);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      className="group rounded-[18px] border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.03] to-cyan-500/[0.03] p-3 shadow-[0_24px_72px_-56px_rgba(56,189,248,0.75)] backdrop-blur-2xl shc-hover-glow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05]">
            <div className="h-5.5 w-5.5 shrink-0">
              <FileIcon
                extension={file.extension}
                {...defaultStyles[file.extension]}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-1.5">
            <div>
              <p className="truncate text-xs font-semibold text-white">{file.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                <FileCode2 className="h-3 w-3" />
                .{file.extension || "file"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${getLanguageTone(file.extension)}`}>
                {languageLabel}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${getStatusTone(file.upload_status)}`}>
                {formatStatusLabel(file.upload_status)}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${
                isPublic
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 bg-white/[0.04] text-slate-300"
              }`}>
                {isPublic ? "Public" : "Private"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-slate-300">
          {formatBytes(file.size)}
        </div>
      </div>

      <div className="mt-3 grid gap-1.5 text-[10px] text-slate-400 sm:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
          <p className="font-medium text-slate-500">Created</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-slate-200">
            <CalendarDays className="h-3 w-3 text-sky-300" />
            {dayjs(file.created_at).format("MMM D, YYYY")}
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
          <p className="font-medium text-slate-500">Updated</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-slate-200">
            <Sparkles className="h-3 w-3 text-fuchsia-300" />
            {dayjs(file.updated_at).fromNow()}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
          <Button
            className="h-8 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2.5 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-400/15"
            onClick={() => {
              navigator.clipboard.writeText(`${location.origin}/share/${file.id}`);
              toast.success("Link copied to clipboard!");
            }}
            title="Copy share link"
            aria-label={`Copy link for ${file.name}`}
          >
            <Copy className="mr-1 h-3 w-3" />
            Copy link
          </Button>
          <Link href={`/share/${file.id}`} className="contents">
            <Button
              className="h-8 rounded-full border border-sky-400/15 bg-sky-400/10 px-2.5 text-[10px] font-semibold text-sky-100 hover:bg-sky-400/15"
              title="Open shared view"
              aria-label={`Open ${file.name}`}
            >
              <Eye className="mr-1 h-3 w-3" />
              Open
            </Button>
          </Link>

          <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-8 rounded-full border border-fuchsia-400/15 bg-fuchsia-400/10 px-2.5 text-[10px] font-semibold text-fuchsia-100 hover:bg-fuchsia-400/15"
                disabled={isDeleteLoading || isVisibilityLoading}
              >
                <Pencil className="mr-1 h-3 w-3" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="border-white/10 bg-[#091120] text-slate-100 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.95)]">
              <DialogHeader>
                <DialogTitle className="text-slate-50">Rename file</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Update the display name shown in your workspace and share page.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  File name
                </label>
                <Input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  className="h-11 rounded-2xl border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-300/30"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRenameDialogOpen(false);
                    setNewName(file.name);
                  }}
                  className="border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.05]"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    void renameCurrentFile();
                  }}
                  disabled={isRenameLoading}
                  className="bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 hover:opacity-90"
                >
                  {isRenameLoading ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            className={`h-8 rounded-full border px-2.5 text-[10px] font-semibold ${
              isPublic
                ? "border-amber-400/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15"
                : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]"
            }`}
            onClick={toggleVisibility}
            disabled={isVisibilityLoading || isDeleteLoading || isRenameLoading}
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
                size="sm"
                aria-label={`Delete ${file.name}`}
                title="Delete file"
                className="h-8 rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 text-[10px] font-semibold text-rose-100 hover:bg-rose-400/15"
                disabled={isDeleteLoading || isVisibilityLoading || isRenameLoading}
              >
                <X className="mr-1 h-3 w-3" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-white/10 bg-[#091120] text-slate-100 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.95)]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-slate-50">Delete file?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  This will permanently delete {file.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={isDeleteLoading}
                  className="border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.05]"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-gradient-to-r from-rose-500 to-orange-400 text-white hover:opacity-90"
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
    </motion.article>
  );
}
