import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/viewadmin/"],
    },
    sitemap: "https://jakejh.com/sitemap.xml",
  };
}
