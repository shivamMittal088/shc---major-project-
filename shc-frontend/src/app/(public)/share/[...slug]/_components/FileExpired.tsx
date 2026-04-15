export default function FileExpired() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-gray-200 p-8 rounded-lg text-center max-w-md">
        <h1 className="text-2xl font-bold mb-2">File Expired</h1>
        <p className="text-gray-600">
          This file was automatically deleted after 48 hours and is no longer
          available.
        </p>
        <a
          href="/"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ← Back to home
        </a>
      </div>
    </div>
  );
}
