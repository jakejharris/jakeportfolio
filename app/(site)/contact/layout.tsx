import type { Metadata } from "next";
import { absoluteUrl } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Jake Harris for full stack development, AI integration, or consulting services. Connect via email or LinkedIn.",
  alternates: {
    canonical: absoluteUrl('/contact/'),
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
