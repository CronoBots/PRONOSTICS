/**
 * Page /plus — désormais un wrapper léger autour du composant
 * <PlusMenu /> (extrait en v6.9). Le composant contient outils, partage,
 * infos. Cette page conserve son URL pour deep-linking, mais le burger
 * de la home redirige vers /compte qui embarque aussi <PlusMenu />.
 */

import Head from "next/head";
import Link from "next/link";

import { PlusMenu } from "@/components/PlusMenu";
import { useI18n } from "@/lib/i18n";

export default function PlusPage() {
  const { t } = useI18n();
  return (
    <>
      <Head>
        <title>{t("plus.titleTab")}</title>
      </Head>
      <main className="max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center text-accent-blue hover:bg-white/5"
            aria-label={t("common.back")}
          >
            ←
          </Link>
          <h1 className="text-lg lg:text-2xl font-bold tracking-tight">{t("plus.title")}</h1>
        </div>

        {/* Sections (Outils, Partager, Infos) + section "Mon compte" */}
        <PlusMenu showAccountSection />

        <div className="text-center text-[10px] text-white/30 mt-8">
          NΞXBΞT · Trust the Algorithm · v0.2 · {new Date().getFullYear()}
        </div>
      </main>
    </>
  );
}
