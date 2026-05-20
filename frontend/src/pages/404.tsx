import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-20 text-center">
      <h1 className="text-3xl font-bold mb-2">Page introuvable</h1>
      <p className="text-white/60 mb-6">Cette page n&apos;existe pas (encore).</p>
      <Link href="/" className="text-brand-100 hover:underline">
        ← Retour aux pronostics
      </Link>
    </main>
  );
}
