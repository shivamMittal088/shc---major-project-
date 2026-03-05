import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

//  not understood meaning why we write {
//   children,
// }: {
//   children: React.ReactNode;
// }
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen">
      <Navbar />
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-4 px-3 pb-4 pt-4 md:grid-cols-[240px_1fr] md:px-5">
        <aside className="hidden md:block">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm backdrop-blur">
            <Sidebar />
          </div>
        </aside>

        <main className="min-h-[calc(100vh-120px)] rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur md:p-6">
          {children}
        </main>
      </div>
    </section>
  );
}
