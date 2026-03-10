export default async function PdfPreview({
  link,
  title,
}: {
  link: string;
  title: string;
}) {
  return (
    <iframe
      title={title}
      src={link}
      className="h-[calc(100vh-8rem)] w-full rounded-lg border border-slate-300 bg-white"
    />
  );
}