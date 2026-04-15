export default async function VideoPreview({ link }: { link: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-black/90 p-4">
      <video
        controls
        src={link}
        className="max-h-full max-w-full rounded-lg shadow-lg"
      />
    </div>
  );
}
