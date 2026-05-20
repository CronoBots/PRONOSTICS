import "@/styles/globals.css";

import type { AppProps } from "next/app";

import { BottomNav } from "@/components/BottomNav";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <div className="pb-20">
        <Component {...pageProps} />
      </div>
      <BottomNav />
    </>
  );
}
