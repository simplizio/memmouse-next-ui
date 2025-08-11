import LandingHome from "@/components/landing/LandingHome";

export default function Home() {
  return <LandingHome />;
}

// "use client";
// import ProjectsOverview from "@/components/projects/ProjectsOverview";
//
// export default function HomePage() {
//   return <ProjectsOverview />;
// }

// import StickyNavbar from "@/components/navigation/StickyNavbar";
// import Sidebar from "@/components/navigation/Sidebar";
//
// export default function HomePage() {
//   return (
//       <>
//         <StickyNavbar />
//         <Sidebar />
//
//         {/* Основной контент: ниже navbar (pt-16) и правее сайдбара (ml-64) */}
//         <main className="pt-16 ml-64 text-white">
//           {/* секция 1 — во всю видимую высоту минус navbar */}
//           <section className="min-h-[calc(100vh-4rem)] p-6 bg-slate-900">
//             <div className="p-4 bg-pink-500 text-white rounded mb-4">
//               TAILWIND TEST — должен быть розовым.
//             </div>
//
//             <div className="max-w-7xl mx-auto">
//               <h1 className="text-3xl font-bold mb-2">Memory-as-a-Service</h1>
//               <p className="opacity-80">
//                 Прокрути — верхняя панель и левый сайдбар остаются на месте.
//               </p>
//
//               <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
//                 {Array.from({ length: 6 }).map((_, i) => (
//                     <div key={i} className="rounded-xl bg-white/5 p-4 border border-white/10">
//                       <div className="text-lg font-semibold">Card #{i + 1}</div>
//                       <div className="text-sm opacity-70">какой‑то контент</div>
//                     </div>
//                 ))}
//               </div>
//             </div>
//           </section>
//
//           {/* секция 2 — тоже «на экран» */}
//           <section className="min-h-[calc(100vh-4rem)] p-6 bg-slate-950 border-t border-white/10">
//             <div className="max-w-7xl mx-auto">
//               <h2 className="text-2xl font-bold mb-4">Вторая секция</h2>
//               <div className="grid gap-4 md:grid-cols-2">
//                 <div className="h-64 rounded-xl bg-white/5 border border-white/10" />
//                 <div className="h-64 rounded-xl bg-white/5 border border-white/10" />
//               </div>
//             </div>
//           </section>
//         </main>
//       </>
//   );
// }
