// Local-only upstream replacement for check-navigation-cache.mjs. The built app
// still runs Next's real fetch cache, ISR, webhook and draft authentication.
const { readFileSync, appendFileSync, writeFileSync } = require('node:fs');
const originalFetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!url.hostname.endsWith('.api.sanity.io')) return originalFetch(input, init);
  const state = JSON.parse(readFileSync(process.env.NAV_CMS_STATE, 'utf8'));
  if (url.pathname.includes('/data/mutate/')) {
    const body = JSON.parse(init.body);
    const id = body.mutations.find((mutation) => mutation.patch)?.patch.id;
    state.count += 1;
    writeFileSync(process.env.NAV_CMS_STATE, JSON.stringify(state));
    const document = { _id: id, _type: 'postView', count: state.count };
    return new Response(JSON.stringify({ transactionId: 'fixture',
      results: [{ id, operation: 'update', document }], documents: [document],
    }), { headers: { 'Content-Type': 'application/json' } });
  }
  const query = url.searchParams.get('query') || '';
  const draft = url.searchParams.get('perspective') === 'drafts';
  appendFileSync(process.env.NAV_CMS_READS, JSON.stringify({ query, draft, version: state.version }) + '\n');
  const slug = JSON.parse(url.searchParams.get('$slug') || '"navigation-cache-fixture"');
  const tag = { _id: 'fixture-tag', title: `Tag ${state.version}`, slug: { current: slug } };
  const post = {
    _id: 'fixture-post', title: `${draft ? 'Private draft' : 'Published'} ${state.version}`,
    slug: { current: slug }, publishedAt: '2026-01-01T00:00:00Z',
    excerpt: 'A local navigation cache fixture.', viewCountBase: 10, tags: [tag],
    content: [{ _type: 'block', _key: 'body', style: 'normal', markDefs: [],
      children: [{ _type: 'span', _key: 'text', marks: [], text: `${draft ? 'Secret draft body' : 'Published body'} ${state.version}` }],
    }],
  };
  if (state.html) post.content.push({ _type: 'codeSnippet', _key: 'html', language: 'html', code: '<p class="example">Hello</p>' });
  let result;
  if (query.includes('_type == "postView"')) {
    if (state.viewFail) return new Response('{"error":"Fixture outage"}', { status: 500 });
    result = JSON.parse(url.searchParams.get('$ids')).map((_id) => ({ _id, count: state.count }));
  }
  else if (query.includes('_type == "tag"')) result = tag;
  else if (query.endsWith('[0]._id')) result = post._id;
  else if (query.includes('[0]')) result = post;
  else result = [post];
  return new Response(JSON.stringify({ result }), { headers: { 'Content-Type': 'application/json' } });
};
