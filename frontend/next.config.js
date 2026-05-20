/**
 * @type {import('next').NextConfig}
 *
 * Build statique pour GitHub Pages : `next build` produit un dossier `out/`
 * que Pages sert tel quel. `basePath` est requis pour les Pages servies depuis
 * `https://<user>.github.io/<repo>/`.
 */
const isProd = process.env.NODE_ENV === "production";
const repoName = process.env.NEXT_PUBLIC_BASE_PATH ?? "/PRONOSTICS";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isProd ? repoName : "",
  assetPrefix: isProd ? `${repoName}/` : "",
  env: {
    NEXT_PUBLIC_RESOLVED_BASE_PATH: isProd ? repoName : "",
  },
};

module.exports = nextConfig;
