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
      className="h-full w-full min-h-[600px] rounded-lg border border-slate-200 bg-white"
    />
  );
}