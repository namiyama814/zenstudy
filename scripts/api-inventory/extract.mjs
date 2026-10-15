import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {parse} from 'acorn';
import * as walk from 'acorn-walk';

// Parse published JavaScript as data. Never evaluate bundles or call API routes.
const run = promisify(execFile);
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const cache = option('--cache', null) ?? await fs.mkdtemp(path.join(os.tmpdir(), 'zenstudy-inventory-'));
const output = option('--out', 'docs/api/inventory.json');
const mainUrl = option('--main-url', 'https://cdn.nnn.ed.nico/tenjin_pc/assets/ohtomi/app.6d7fb69bf5e69a32dbb5.js');
const download = args.includes('--download');
await fs.mkdir(cache, {recursive: true});

async function getSource(url, filename) {
  const u = new URL(url);
  if (u.origin !== 'https://cdn.nnn.ed.nico' || !/\.js$/.test(u.pathname)) throw new Error('Unexpected source URL');
  const file = path.join(cache, filename);
  try { await fs.access(file); } catch {
    if (!download) throw new Error(`Missing ${file}; use --download`);
    await run('curl', ['-fLsS', '--max-time', '60', url, '-o', file]);
  }
  const text = await fs.readFile(file, 'utf8');
  return {file: filename, url, text, sha256: crypto.createHash('sha256').update(text).digest('hex'), bytes: Buffer.byteLength(text)};
}
const astOf = source => parse(source, {ecmaVersion: 'latest', sourceType: 'script'});
const main = await getSource(mainUrl, 'app.js');
const chunks = new Map();
walk.simple(astOf(main.text), {AssignmentExpression(node) {
  // Only webpack's JS loader .u, not the CSS loader (some chunk keys overlap).
  if (node.left.type !== 'MemberExpression' || node.left.property.name !== 'u') return;
  walk.simple(node.right, {ObjectExpression(object) {
    for (const p of object.properties) {
      const key = p.key?.value ?? p.key?.name;
      if (typeof key === 'string' && /^(src_|vendors-)[\w-]+$/.test(key) && p.value?.type === 'Literal' && /^[0-9a-f]{20}$/.test(p.value.value)) chunks.set(key, p.value.value);
    }
  }});
}});
const specs = [...chunks].map(([key, hash]) => ({file: `${key}.${hash}.js`, url: new URL(`${key}.${hash}.js`, mainUrl).href}));
specs.push(...[
  ['exercise.js', 'exercise-ed100af29148f12abda1.js'],
  ['evaluationTest.js', 'evaluationTest-ee707482cd22c50a61f9.js'],
  ['essayTest.js', 'essayTest-b3f2bf0f6539daf11048.js']
].map(([file, name]) => ({file, url: `https://cdn.nnn.ed.nico/kokuban/exercises/${name}`})));
const sources = [main];
for (let i = 0; i < specs.length; i += 4) {
  sources.push(...await Promise.all(specs.slice(i, i + 4).map(s => getSource(s.url, s.file))));
}

function category(route) {
  if (/\/debug\//.test(route)) return 'debug';
  if (/forum|questions|balloons|reports\/(reasons|violation|infringement)|tags\/question/.test(route)) return 'forum';
  if (/oauth|auth|login|tokens|bindings/.test(route)) return 'auth';
  if (/payment|subscription|billing|purchase|coupon|charge|receipt|products/.test(route)) return 'payments';
  if (/recognition/.test(route)) return 'recognition';
  if (/assessment_test|short_test|essay_|evaluation_|periodic_exam|answering|\/answers/.test(route)) return 'tests-reports';
  if (/\/lessons|\/media|broadcast|comment|enquete|\/live|\/solution|tags\/lesson/.test(route)) return 'lessons';
  if (/movie|playback|\/session/.test(route)) return 'video';
  if (/dashboard|learning_amount|learning_event|learning_histor|study_plan|my_courses|scale_score/.test(route)) return 'dashboard';
  if (/official_event|event_calendar|kd_edu/.test(route)) return 'events';
  if (/notices|announcements/.test(route)) return 'notices';
  if (/users|profiles|schools|search\/|colleges|highschools/.test(route)) return 'profile';
  if (/material|genres|courses|chapters|subjects|guides|references/.test(route)) return 'materials';
  if (/contact/.test(route)) return 'contact';
  return 'other';
}

const definitions = [];
const literals = [];
for (const source of sources) {
  const ast = astOf(source.text);
  const slice = n => source.text.slice(n.start, n.end);
  walk.ancestor(ast, {CallExpression(node, ancestors) {
    const callee = node.callee;
    const name = callee.type === 'MemberExpression' ? (callee.property.name ?? callee.property.value) : callee.name;
    if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'requestWithJson', 'sendBeacon', 'fetch', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(name)) return;
    const owner = [...ancestors].reverse().find(a =>
      (a.type === 'AssignmentExpression' && a.left.type === 'MemberExpression' && a.right.start <= node.start && a.right.end >= node.end) ||
      (a.type === 'MethodDefinition' && a.value.start <= node.start && a.value.end >= node.end));
    const fn = owner?.type === 'AssignmentExpression' ? owner.right : owner?.value;
    const ownerName = owner?.type === 'AssignmentExpression' ? (owner.left.property.name ?? owner.left.property.value) : owner?.key?.name;
    const aliases = new Map();
    for (const p of fn?.params ?? []) if (p.type === 'ObjectPattern') {
      for (const prop of p.properties) if (prop.type === 'Property' && prop.value.type === 'Identifier') aliases.set(prop.value.name, prop.key.name ?? prop.key.value);
    }
    const locals = new Map();
    if (fn?.body) walk.simple(fn.body, {VariableDeclarator(d) { if (d.id.type === 'Identifier' && d.init) locals.set(d.id.name, d.init); }});
    const expressions = [];
    const expr = n => {
      if (n.type === 'Identifier') return aliases.get(n.name) ?? n.name;
      if (n.type === 'MemberExpression' && !n.computed) return n.property.name;
      const index = expressions.push(slice(n)) - 1;
      return `expression${index}`;
    };
    function routeOf(n, depth = 0) {
      if (!n || depth > 4) return null;
      if (n.type === 'Literal' && typeof n.value === 'string') return n.value;
      if (n.type === 'ConditionalExpression' && /[`"']\?/.test(slice(n))) return '?{query}';
      if (n.type === 'TemplateLiteral') return n.quasis.map((q, i) => {
        if (i >= n.expressions.length) return q.value.cooked;
        const expression = n.expressions[i];
        const querySuffix = expression.type === 'ConditionalExpression' && /[`"']\?/.test(slice(expression));
        return q.value.cooked + (querySuffix ? '?{query}' : `{${expr(expression)}}`);
      }).join('');
      if (n.type === 'Identifier' && locals.has(n.name)) return routeOf(locals.get(n.name), depth + 1);
      if (n.type === 'BinaryExpression' && n.operator === '+') {
        const a = routeOf(n.left, depth + 1), b = routeOf(n.right, depth + 1);
        return (a ?? `{${expr(n.left)}}`) + (b ?? `{${expr(n.right)}}`);
      }
      return null;
    }
    const template = routeOf(node.arguments[0]);
    if (!template || !/\/v\d+\//.test(template)) return;
    let method = name.toUpperCase();
    if (name === 'requestWithJson') method = node.arguments[1]?.value ?? 'UNKNOWN';
    if (name === 'sendBeacon') method = 'POST';
    if (name === 'fetch') {
      const options = node.arguments[1];
      method = options?.properties?.find(p => p.key.name === 'method' || p.key.value === 'method')?.value?.value ?? 'GET';
    }
    let route = template.slice(template.search(/\/v\d+\//));
    const qpos = route.indexOf('?');
    const queryTemplate = qpos < 0 ? null : route.slice(qpos + 1);
    const pathTemplate = qpos < 0 ? route : route.slice(0, qpos);
    route = pathTemplate.replace(/\{[^{}]*\}/g, '{id}');
    // Keep unresolved nested expressions explicit, instead of fabricating a URL.
    const unresolved = /[{}]/.test(route.replaceAll('{id}', '')) || expressions.some((e, i) => pathTemplate.includes(`{expression${i}}`) && /\)\(/.test(e));
    const host = /papi|tenjinPapiEndpoint/.test(slice(callee) + ' ' + slice(node.arguments[0]) + ' ' + source.file) ? 'papi' : 'api';
    const dataIndex = name === 'requestWithJson' ? 2 : 1;
    definitions.push({method, route, host, category: category(route), verification: 'source_only', unresolved, template,
      queryTemplate, expressions, owner: ownerName ?? null, parameters: fn?.params?.map(slice) ?? [],
      requestExpression: node.arguments[dataIndex] ? slice(node.arguments[dataIndex]).slice(0, 1500) : null,
      source: source.file, offsetUtf16: node.start});
  }, Literal(node) {
    if (typeof node.value === 'string' && /^\/v\d+\//.test(node.value)) literals.push({path: node.value, source: source.file, offsetUtf16: node.start});
  }, TemplateLiteral(node) {
    const first = node.quasis[0]?.value.cooked;
    if (first && /^\/v\d+\//.test(first)) literals.push({path: node.quasis.map((q, i) => q.value.cooked + (i < node.expressions.length ? '{id}' : '')).join(''), source: source.file, offsetUtf16: node.start});
  }});
}

const groups = new Map();
const reviewed = JSON.parse(await fs.readFile(new URL('./reviewed-expansions.json', import.meta.url), 'utf8'));
const expanded = [];
for (const d of definitions) {
  if (d.unresolved && reviewed.lessonOwners.includes(d.owner) && d.route.startsWith('/v1/{id}')) {
    for (const lessonPath of [reviewed.lessonPathHelper.advanced, reviewed.lessonPathHelper.basicAndZenUniv]) expanded.push({...d,
      route: d.route.replace('/v1/{id}', `/v1/${lessonPath}`), expandedFrom: d.route, expansionEvidence: reviewed.lessonPathHelper, unresolved: false});
  } else if (d.owner === reviewed.essayOwner && d.route.includes('/{id}/{id}/answerings')) {
    for (const resourceType of reviewed.essayResourceTypes) expanded.push({...d,
      route: d.route.replace('/chapters/{id}/{id}/{id}/answerings', `/chapters/{id}/${resourceType}/{id}/answerings`), expandedFrom: d.route,
      expansionEvidence: 'essayTest bundle call sites of answerNSchoolEssayMaterial', unresolved: false});
  } else expanded.push(d);
}
for (const d of expanded) {
  d.category = category(d.route);
  const key = `${d.host} ${d.method} ${d.route}`;
  if (!groups.has(key)) groups.set(key, {host: d.host, method: d.method, path: d.route, category: d.category, verification: 'source_only', unresolved: d.unresolved, definitions: []});
  groups.get(key).definitions.push(d);
}
const endpoints = [...groups.values()].sort((a, b) => `${a.category} ${a.path} ${a.method}`.localeCompare(`${b.category} ${b.path} ${b.method}`));
const canonical = s => s.split('?')[0].replace(/\{[^{}]*\}/g, '{id}').replace(/(threads|my_threads|progress\/start|progress\/passed)\{id\}$/, '$1').replace(/\{id\}\{id\}$/, '{id}');
const classifiedLiterals = new Set([...definitions, ...expanded].map(d => canonical(d.route)));
const unclassified = [...new Map(literals.filter(l => !classifiedLiterals.has(canonical(l.path))).map(l => [l.path, l])).values()];
const inventory = {generatedFrom: 'Published web JavaScript only; not a complete server route list', observedOn: '2026-10-15',
  parser: 'acorn AST; HTTP call expressions and API path literals; no JavaScript execution',
  scope: {mainUrl, javascriptChunks: chunks.size, kokubanBundles: 3, parsedSources: sources.length},
  limitations: ['Static definition does not establish deployment, authorization, or current use.', 'Minified expressions and inferred api/papi labels require review.', 'Backend-only, mobile-only, and unreferenced endpoints are outside this source set.', 'No API endpoint is requested by this extractor.'],
  sources: sources.map(({text, ...meta}) => meta), reviewedExpansions: reviewed, endpoints, unclassifiedPathLiterals: unclassified};
await fs.mkdir(path.dirname(output), {recursive: true});
await fs.writeFile(output, JSON.stringify(inventory, null, 2) + '\n');
console.log(JSON.stringify({sources: sources.length, definitions: definitions.length, endpoints: endpoints.length, unclassified: unclassified.length, output}));
