import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "忘れ物・落とし物管理",
    short_name: "おかえり受付",
    description: "持ち主へ、きちんとつなぐ。拾得物の受付管理。",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f6",
    theme_color: "#267364",
    lang: "ja",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
