import Link from "next/link";
import Head from "next/head";

export default function NotFound() {
  return (
    <>
      <Head>
        <title>Page introuvable — WTF</title>
      </Head>
      <main className="max-w-md mx-auto px-6 py-16 text-center min-h-[60vh] flex flex-col justify-center items-center">
        <div className="text-8xl mb-4 opacity-40">🤖</div>
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <p className="text-white/60 mb-8 max-w-sm">
          Même notre IA n'a pas trouvé cette page. Elle s'est probablement
          déplacée — ou n'a jamais existé.
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-green text-bg-base font-bold hover:opacity-90"
        >
          ← Retour à l'app
        </Link>
        <p className="text-white/30 text-xs mt-8">
          WTF · Win The Future
        </p>
      </main>
    </>
  );
}
