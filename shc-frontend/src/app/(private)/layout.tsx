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
      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 gap-3 px-2 pb-3 pt-3 md:grid-cols-[220px_1fr] md:px-4">
        <aside className="hidden md:block">
          <div className="sticky top-20 rounded-xl border border-slate-200 bg-white/80 p-1.5 shadow-sm backdrop-blur">
            <Sidebar />
          </div>
        </aside>

        <main className="min-h-[calc(100vh-96px)] rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur md:p-4">
          {children}
        </main>
      </div>
    </section>
  );
}
