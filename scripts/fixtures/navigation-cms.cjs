// Local-only upstream replacement for check-navigation-cache.mjs. The built app
// still runs Next's real fetch cache, ISR, webhook and draft authentication.
const { readFileSync, appendFileSync } = require('node:fs');
const originalFetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!url.hostname.endsWith('.api.sanity.io')) return originalFetch(input, init);
  const state = JSON.parse(readFileSync(process.env.NAV_CMS_STATE, 'utf8'));
  const query = url.searchParams.get('query') || '';
  const draft = url.searchParams.get('perspective') === 'drafts';
  appendFileSync(process.env.NAV_CMS_READS, JSON.stringify({ query, draft, version: state.version }) + '\n');
  const slug = 'navigation-cache-fixture';
  const tag = { _id: 'fixture-tag', title: `Tag ${state.version}`, slug: { current: slug } };
  const post = {
    _id: 'fixture-post', title: `${draft ? 'Private draft' : 'Published'} ${state.version}`,
    slug: { current: slug }, publishedAt: '2026-01-01T00:00:00Z',
    excerpt: 'A local navigation cache fixture.', viewCountBase: 10, tags: [tag],
    content: [{ _type: 'block', _key: 'body', style: 'normal', markDefs: [],
      children: [{ _type: 'span', _key: 'text', marks: [], text: `${draft ? 'Secret draft body' : 'Published body'} ${state.version}` }],
    }],
  };
  let result;
  if (query.includes('_type == "postView"')) result = [{ _id: `views.${slug}`, count: state.count }];
  else if (query.includes('_type == "tag"')) result = tag;
  else if (query.includes('[0]')) result = post;
  else result = [post];
  return new Response(JSON.stringify({ result }), { headers: { 'Content-Type': 'application/json' } });
};
