import { MetadataRoute } from "next";
import { SITE_URL } from "@/app/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/viewadmin/", "/studio/", "/drafts"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
