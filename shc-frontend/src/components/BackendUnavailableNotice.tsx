type BackendUnavailableNoticeProps = {
  title: string;
  description: string;
};

export default function BackendUnavailableNotice({
  title,
  description,
}: BackendUnavailableNoticeProps) {
  return (
    <div className="rounded-[24px] border border-amber-400/15 bg-amber-500/8 px-5 py-5 text-amber-100 shadow-[0_20px_80px_-50px_rgba(251,191,36,0.55)] backdrop-blur-xl">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-amber-100/80">{description}</p>
      <p className="mt-2 text-xs font-medium text-amber-200/80">
        Make sure the backend is running and reachable, then refresh the page.
      </p>
    </div>
  );
}