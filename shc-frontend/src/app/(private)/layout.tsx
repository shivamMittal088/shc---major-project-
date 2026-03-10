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
    <section className="shc-private-shell relative min-h-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0 shc-private-grid opacity-35" />
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/8 blur-3xl" />
      <Navbar />
      <div className="relative mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-3 px-2.5 pb-5 pt-3 md:grid-cols-[220px_1fr] md:px-4">
        <aside className="hidden md:block">
          <div className="sticky top-22 rounded-[22px] p-1.5 shc-glass-panel-strong">
            <Sidebar />
          </div>
        </aside>

        <main className="min-h-[calc(100vh-108px)] rounded-[30px] border border-white/10 bg-[#07101f]/72 p-4 shadow-[0_45px_120px_-70px_rgba(0,0,0,0.85)] backdrop-blur-2xl md:p-6">
          {children}
        </main>
      </div>
    </section>
  );
}
