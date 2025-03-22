import Image from "next/image";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="row-start-2">
        {/* Only the Next.js logo image is displayed */}
      </main>
      <footer className="row-start-3">
        {/* Footer is intentionally left empty */}
      </footer>
    </div>
  );
}
