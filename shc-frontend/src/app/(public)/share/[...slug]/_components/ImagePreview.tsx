export default async function ImagePreview({
  link,
  name,
}: {
  link: string;
  name: string;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-900/5 p-4">
      <img
        alt={name}
        src={link}
        className="max-h-full max-w-full rounded-lg object-contain shadow-md"
      />
    </div>
  );
}
