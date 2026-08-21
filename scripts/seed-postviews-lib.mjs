const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;

export function getPostViewId(slug) {
  return `views.${slug}`;
}

export function planPostViewSeeds(posts) {
  return posts.map((post) => {
    if (typeof post.slug !== 'string' || !SLUG_PATTERN.test(post.slug)) {
      throw new Error(`Post ${post._id ?? '(unknown)'} has an invalid slug`);
    }

    const count = post.viewCount ?? 0;
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(`Post ${post._id ?? post.slug} has an invalid viewCount`);
    }

    return {
      slug: post.slug,
      id: getPostViewId(post.slug),
      count,
    };
  });
}
