function hasSeedValue(value) {
  return value !== undefined && value !== null;
}

export function isViewBaselineSeeded(post) {
  return (
    hasSeedValue(post.viewCountBase) || hasSeedValue(post.viewsCutoverAt)
  );
}

export function planViewBaselineSeeds(posts, viewsCutoverAt) {
  const postsToSeed = [];
  const skippedPosts = [];

  for (const post of posts) {
    if (isViewBaselineSeeded(post)) {
      skippedPosts.push(post);
      continue;
    }

    postsToSeed.push({
      ...post,
      seedValues: {
        viewCountBase: post.viewCount ?? 0,
        viewsCutoverAt,
      },
    });
  }

  return { postsToSeed, skippedPosts };
}
