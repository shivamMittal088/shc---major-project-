type BackendUnavailableNoticeProps = {
  title: string;
  description: string;
};

export default function BackendUnavailableNotice({
  title,
  description,
}: BackendUnavailableNoticeProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 shadow-sm">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-amber-900">{description}</p>
      <p className="mt-2 text-xs font-medium text-amber-800">
        Make sure the backend is running and reachable, then refresh the page.
      </p>
    </div>
  );
}