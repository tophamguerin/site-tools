// Schema Entity-Spine Detector — run via Chrome MCP evaluate_script
//
// Goes far beyond "is there JSON-LD?". Audits the structured-data graph for the
// signals that actually drive AI-search entity consolidation (ChatGPT,
// Perplexity, Google AI Overviews, Gemini, Bing Copilot):
//
//   1. Canonical @id spine     — primary entities carry a stable @id; refs resolve.
//   2. No @id-less duplicates  — the anti-pattern: a fresh, @id-less Person/Org on
//                                every page that nothing can consolidate.
//   3. sameAs KG precondition  — Org needs Wikipedia + Wikidata; people need >=1
//                                authoritative profile (LinkedIn min). Knowledge-Graph
//                                merge keys primarily off sameAs.
//   4. Offices                 — Place + PostalAddress + hasMap (local SEO / maps).
//   5. Coverage entity-linking — Article/NewsArticle reference entities by @id via
//                                about / author / mentions; Quotation.spokenByCharacter.
//   6. CollectionPage          — list/index pages declare mainEntity/about + hasPart.
//   7. Escaping / XSS          — JSON-LD routed through a hardened serializer (no raw
//                                "<"/">"/"&"); malformed blocks = breakout / bad escaping.
//
// Returns RAW signals; the skill applies the scoring rubric. Pattern reference:
// the tg.agency / bjhguerin.com schema entity spine (src/lib/schema.ts).
//
// Usage: run the function body via evaluate_script on each rendered page.

// eslint-disable-next-line no-unused-vars
const schemaEntitySpine = () => {
  const pageOrigin = location.origin;

  // ---- Known-authoritative sameAs hosts (KG / AI-search signal weight) -------
  const AUTH_HOSTS = [
    'wikipedia.org', 'wikidata.org', 'crunchbase.com', 'linkedin.com',
    'github.com', 'orcid.org', 'scholar.google', 'imdb.com', 'muckrack.com',
    'twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'youtube.com',
    'tiktok.com', 'threads.net', 'mastodon',
  ];
  const STRONG_AUTH = ['wikipedia.org', 'wikidata.org', 'linkedin.com', 'crunchbase.com', 'orcid.org'];
  // Primary = entities that should carry a canonical @id. Excludes Place: office
  // locations nested in Org.location are legit without their own top-level @id.
  const PRIMARY_TYPES = [
    'Organization', 'Corporation', 'NGO', 'LocalBusiness', 'Person', 'WebSite',
    'WebPage', 'AboutPage', 'CollectionPage', 'ProfilePage', 'Article',
    'NewsArticle', 'OpinionNewsArticle', 'BlogPosting', 'TechArticle',
    'Product', 'Event',
  ];
  const ARTICLE_TYPES = ['Article', 'NewsArticle', 'OpinionNewsArticle', 'BlogPosting', 'TechArticle', 'Report', 'ScholarlyArticle'];
  const ORG_TYPES = ['Organization', 'Corporation', 'NGO', 'LocalBusiness'];
  const COLLECTION_TYPES = ['CollectionPage', 'ItemList', 'ProfilePage'];

  const typeList = (t) => (Array.isArray(t) ? t : t ? [t] : []).map(String);
  const hasType = (node, set) => typeList(node['@type']).some((t) => set.includes(t));
  const host = (u) => { try { return new URL(u, pageOrigin).hostname.replace(/^www\./, ''); } catch { return ''; } };
  const isAuth = (u, set) => { const h = host(u); return set.some((a) => h.includes(a)); };
  const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

  // ---- Parse every ld+json block; track escaping + malformed blocks ----------
  const scriptEls = [...document.querySelectorAll('script[type="application/ld+json"]')];
  const parsed = [];
  const malformed = [];
  let literalLt = 0, literalGt = 0, literalAmp = 0, scriptBreakout = false;

  scriptEls.forEach((el, i) => {
    const raw = el.textContent || '';
    // A hardened serializer escapes <,>,& to \uXXXX. Any literal occurrence means
    // the page is NOT using one — a latent stored-XSS if a data field ever holds
    // "</script>". (& is noisier — common in unescaped URLs — so weight it lower.)
    literalLt += (raw.match(/</g) || []).length;
    literalGt += (raw.match(/>/g) || []).length;
    literalAmp += (raw.match(/&/g) || []).length;
    if (/<\/script/i.test(raw)) scriptBreakout = true;
    try {
      parsed.push(JSON.parse(raw));
    } catch (e) {
      malformed.push({ index: i, error: String(e).slice(0, 120), snippet: raw.slice(0, 80) });
    }
  });

  // ---- Flatten into a node list (handle @graph, arrays, nesting) -------------
  const allObjects = [];
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') {
      allObjects.push(v);
      Object.entries(v).forEach(([k, val]) => { if (k !== '@context') walk(val); });
    }
  };
  parsed.forEach((doc) => {
    if (doc && Array.isArray(doc['@graph'])) doc['@graph'].forEach(walk);
    else walk(doc);
  });

  // Full node = has @type. Ref = object with @id and no @type (a pointer).
  const fullNodes = allObjects.filter((o) => o['@type']);
  const refs = allObjects.filter((o) => o['@id'] && !o['@type']);
  const fullNodeIds = new Set(fullNodes.map((n) => n['@id']).filter(Boolean));

  // @context present on each top-level doc?
  const docsWithContext = parsed.filter((d) => d && (d['@context'] || (Array.isArray(d['@graph']) && d['@context']))).length;

  // ---- 3. @id-less Person/Org: separate YOUR spine from third parties --------
  // The consolidation-killer anti-pattern is the SITE'S OWN entity re-emitted
  // without an @id (nothing can merge it). A third-party outlet/subject in a
  // coverage graph (e.g. a NewsArticle's publisher, or the person an external
  // article is *about*) is legitimately inline and @id-less — don't penalise it,
  // just note it as a sameAs-enrichment candidate.
  //   own  = Person with worksFor, OR Org that looks like the site's (location/logo
  //          /url on page origin). external = everything else @id-less.
  const looksOwnOrg = (n) =>
    n.location || n.logo || (typeof n.url === 'string' && n.url.startsWith(pageOrigin));
  const idlessPersonOrg = [];      // own, un-consolidated → the anti-pattern (penalised)
  const externalEntities = [];     // third party, inline → informational (enrich sameAs)
  fullNodes
    .filter((n) => hasType(n, [...ORG_TYPES, 'Person']) && !n['@id'])
    .forEach((n) => {
      const entry = {
        type: typeList(n['@type']).join('/'),
        name: n.name || '(unnamed)',
        sameAs: asArray(n.sameAs).filter(Boolean).length,
      };
      const isOwn = hasType(n, ['Person']) ? !!n.worksFor : looksOwnOrg(n);
      if (isOwn) idlessPersonOrg.push(entry);
      else externalEntities.push(entry);
    });
  const externalNames = new Set(externalEntities.map((e) => e.name));

  // ---- 1. Canonical @id coverage (exclude third-party coverage entities) ----
  const primaryNodes = fullNodes.filter((n) => hasType(n, PRIMARY_TYPES));
  const primaryMissingId = primaryNodes
    .filter((n) => !n['@id'] && !externalNames.has(n.name))
    .map((n) => typeList(n['@type']).join('/'));

  // ---- 2. Ref resolution -----------------------------------------------------
  // A CollectionPage/ItemList legitimately references item @ids whose full nodes
  // live on their OWN pages (Google resolves them by crawling) — that's the
  // distributed-collection pattern, not a broken ref. Collect those item @ids so
  // we don't mis-flag them as dangling.
  const listRefIds = new Set();
  fullNodes.forEach((n) => {
    ['hasPart', 'itemListElement'].forEach((k) => {
      asArray(n[k]).forEach((v) => {
        if (v && typeof v === 'object') {
          const id = v['@id'] || (v.item && (typeof v.item === 'string' ? v.item : v.item['@id']));
          if (id) listRefIds.add(id);
        }
      });
    });
  });
  let resolvedLocal = 0, crossOrigin = 0, crossPageListItems = 0;
  const danglingSameOrigin = [];
  refs.forEach((r) => {
    const id = r['@id'];
    if (fullNodeIds.has(id)) { resolvedLocal++; return; }
    const sameOrigin = id.startsWith(pageOrigin) || id.startsWith('#') || id.startsWith('/');
    if (!sameOrigin) { crossOrigin++; return; } // legit: Org @id on another owned domain
    if (listRefIds.has(id)) { crossPageListItems++; return; } // legit: list item defined on its own page
    danglingSameOrigin.push(id); // a same-origin ref resolving to nothing = a real spine gap
  });

  // ---- Organization analysis -------------------------------------------------
  const orgNodes = fullNodes.filter((n) => hasType(n, ORG_TYPES));
  const orgs = orgNodes.map((org) => {
    const sameAs = asArray(org.sameAs).filter(Boolean);
    const locations = asArray(org.location).filter((l) => l && typeof l === 'object');
    return {
      name: org.name || '(unnamed)',
      hasId: !!org['@id'],
      sameAsCount: sameAs.length,
      hasWikipedia: sameAs.some((u) => host(u).includes('wikipedia.org')),
      hasWikidata: sameAs.some((u) => host(u).includes('wikidata.org')),
      authoritative: sameAs.filter((u) => isAuth(u, AUTH_HOSTS)).length,
      places: locations.length,
      placesWithAddress: locations.filter((l) => l.address && (l.address['@type'] === 'PostalAddress' || l.address.streetAddress)).length,
      placesWithMap: locations.filter((l) => l.hasMap).length,
    };
  });

  // ---- Person analysis -------------------------------------------------------
  const personNodes = fullNodes.filter((n) => hasType(n, ['Person']));
  const people = personNodes.map((p) => {
    const sameAs = asArray(p.sameAs).filter(Boolean);
    // "Own" = a person the site represents (worksFor an org, or carries an @id).
    // Their missing sameAs is a real entity-strength gap; an external journalist's
    // is informational only.
    const own = !!p.worksFor || !!p['@id'];
    return {
      name: p.name || '(unnamed)',
      own,
      hasId: !!p['@id'],
      sameAsCount: sameAs.length,
      hasAuthoritative: sameAs.some((u) => isAuth(u, STRONG_AUTH)),
      worksFor: !!p.worksFor,
    };
  });
  const peopleWithoutAuth = people.filter((p) => !p.hasAuthoritative).map((p) => p.name);
  const ownWithoutAuth = people.filter((p) => p.own && !p.hasAuthoritative).map((p) => p.name);

  // ---- 5. Coverage entity-linking -------------------------------------------
  const articleNodes = fullNodes.filter((n) => hasType(n, ARTICLE_TYPES));
  const refersToEntity = (val) => asArray(val).some((v) => v && typeof v === 'object' && (v['@id'] || v.name || v['@type']));
  const articles = articleNodes.map((a) => ({
    type: typeList(a['@type']).join('/'),
    headline: (a.headline || a.name || '').slice(0, 60),
    hasAbout: refersToEntity(a.about),
    hasAuthor: refersToEntity(a.author),
    hasMentions: refersToEntity(a.mentions),
    isBasedOn: !!a.isBasedOn,
    linksEntity: refersToEntity(a.about) || refersToEntity(a.author) || refersToEntity(a.mentions),
  }));
  const quotationNodes = fullNodes.filter((n) => hasType(n, ['Quotation']));
  const quotationsWithSpeaker = quotationNodes.filter((q) => q.spokenByCharacter).length;

  // ---- 6. CollectionPage / list semantics -----------------------------------
  const collectionNodes = fullNodes.filter((n) => hasType(n, COLLECTION_TYPES));
  const collections = collectionNodes.map((c) => ({
    type: typeList(c['@type']).join('/'),
    hasMainEntity: !!(c.mainEntity || c.about),
    hasPart: !!(c.hasPart || c.itemListElement),
  }));

  // ---- Escaping verdict ------------------------------------------------------
  let escapingRisk = 'none';
  if (scriptBreakout || malformed.length) escapingRisk = 'present';
  else if (literalLt > 0 || literalGt > 0) escapingRisk = 'latent';

  return {
    blocks: { total: scriptEls.length, parsed: parsed.length, malformed: malformed.length, malformedDetail: malformed },
    nodes: {
      total: fullNodes.length,
      byType: fullNodes.reduce((acc, n) => {
        typeList(n['@type']).forEach((t) => { acc[t] = (acc[t] || 0) + 1; });
        return acc;
      }, {}),
    },
    ids: {
      primaryNodes: primaryNodes.length,
      primaryMissingId,
      hasContext: docsWithContext === parsed.length && parsed.length > 0,
    },
    refs: { total: refs.length, resolvedLocal, crossOrigin, crossPageListItems, danglingSameOrigin },
    duplicates: { idlessPersonOrg },
    externalEntities, // third-party Person/Org inline in coverage graphs — enrich sameAs (not penalised)
    org: { count: orgs.length, detail: orgs },
    people: {
      count: people.length,
      withAuthoritative: people.filter((p) => p.hasAuthoritative).length,
      withoutAuthoritative: peopleWithoutAuth,
      ownWithoutAuthoritative: ownWithoutAuth,
      detail: people,
    },
    coverage: {
      articles: articles.length,
      withEntityLink: articles.filter((a) => a.linksEntity).length,
      withoutEntityLink: articles.filter((a) => !a.linksEntity).map((a) => a.headline || a.type),
      quotations: quotationNodes.length,
      quotationsWithSpeaker,
      detail: articles,
    },
    collection: { count: collections.length, detail: collections },
    escaping: {
      risk: escapingRisk, // 'none' | 'latent' | 'present'
      literalLt, literalGt, literalAmp, scriptBreakout,
      note:
        escapingRisk === 'present'
          ? 'Malformed/broken JSON-LD or a </script> sequence — serializer is not escaping; active or imminent breakout.'
          : escapingRisk === 'latent'
            ? 'JSON-LD contains literal < / > — not routed through a hardened serializer. If any data field ever contains "</script>", it breaks out of the element (stored XSS). Route all JSON-LD through a jsonLdScript()-style escaper.'
            : 'All JSON-LD appears escaped (no literal < / >).',
    },
  };
};
