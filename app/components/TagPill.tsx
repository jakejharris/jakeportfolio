"use client";

import { useRouter } from "next/navigation";
import TransitionLink from "./TransitionLink";

interface TagPillProps {
  tag: { title: string; slug: { current: string } };
  linked: boolean;
}

export default function TagPill({ tag, linked }: TagPillProps) {
  const router = useRouter();

  if (linked) {
    return (
      <TransitionLink
        href={`/tags/${tag.slug.current}#`}
        scroll={true}
        className="tag-pill text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center cursor-pointer no-underline"
      >
        {tag.title}
      </TransitionLink>
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        router.push("/tags/" + tag.slug.current + "#");
      }}
      className="tag-pill text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center cursor-pointer no-underline"
    >
      {tag.title}
    </span>
  );
}
