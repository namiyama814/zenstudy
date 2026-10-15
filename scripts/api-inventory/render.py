#!/usr/bin/env python3
"""Join static definitions with sanitized observations; render the endpoint index."""
import collections
import json
import pathlib
import re
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[2]
DOCS = ROOT / 'docs/api'
inventory = json.loads((DOCS / 'inventory.json').read_text())
categories = {
    'auth': '認証・アカウント連携', 'profile': 'プロフィール・学校検索',
    'materials': '教材・コース', 'dashboard': '進捗・学習履歴',
    'video': '動画・再生セッション', 'lessons': '授業・コメント',
    'tests-reports': 'テスト・レポート', 'forum': 'フォーラム・通報',
    'notices': '通知・アナウンス', 'events': 'イベント',
    'payments': '商品・決済', 'recognition': '顔認証', 'contact': '問い合わせ',
    'debug': 'debug定義（未実行）', 'other': 'その他',
}
endpoints = [{k: e[k] for k in ('host', 'method', 'path', 'category')} |
             {'sourceIndex': i, 'evidence': [], 'verification': 'source_only'}
             for i, e in enumerate(inventory['endpoints'])]

def pattern(route):
    return '^' + ''.join('[^/]+' if p.startswith('{') else re.escape(p)
                         for p in re.split(r'(\{[^}]+\})', route)) + '$'

def host_of(value):
    return 'papi' if 'papi.nnn.ed.nico' in value else 'api'

web = []
for file in sorted(DOCS.glob('*observations.json')):
    data = json.loads(file.read_text())
    for index, obs in enumerate(data.get('requests', [])):
        host = obs.get('host', data.get('baseUrl', 'https://api.nnn.ed.nico'))
        route = obs['path'].split('?')[0]
        ref = {'file': file.name, 'requestIndex': index, 'status': obs['status']}
        if 'www.nnn.ed.nico' in host:
            web.append(ref | {'method': obs['method'], 'path': route})
            continue
        label = host_of(host)
        if label == 'papi' and route.startswith('/prod/'):
            route = route[5:]
        matches = [e for e in endpoints if e['host'] == label and e['method'] == obs['method']
                   and re.fullmatch(pattern(e['path']), route)]
        if matches:
            # Prefer the most specific definition over generic material type routes.
            e = max(matches, key=lambda x: len(re.sub(r'\{[^}]+\}', '', x['path'])))
        else:
            normalized = re.sub(r'/\d+(?=/|$)', '/{id}', route)
            e = next((x for x in endpoints if x['host'] == label and x['method'] == obs['method'] and x['path'] == normalized), None)
            if e is None:
                e = {'host': label, 'method': obs['method'], 'path': normalized, 'category': 'materials' if '/material/' in route else 'other',
                     'sourceIndex': None, 'evidence': [], 'verification': 'network_only'}
                endpoints.append(e)
        e['evidence'].append(ref)

for e in endpoints:
    statuses = sorted({str(r['status']) for r in e['evidence']})
    e['observedStatuses'] = statuses
    if any(re.fullmatch(r'2\d\d', s) for s in statuses):
        e['verification'] = 'observed_success'
    elif e['evidence']:
        e['verification'] = 'observed_error_or_attempt'
    else:
        e['verification'] = 'source_only'

endpoints.sort(key=lambda e: (list(categories).index(e['category']), e['path'], e['method']))
summary = {
    'sourceFiles': len(inventory['sources']), 'staticRouteFamilies': len(inventory['endpoints']),
    'catalogRouteFamilies': len(endpoints), 'apiObservationRecords': sum(len(e['evidence']) for e in endpoints),
    'webObservationRecords': len(web), 'verification': dict(collections.Counter(e['verification'] for e in endpoints)),
    'methodCounts': dict(collections.Counter(e['method'] for e in endpoints)),
}
catalog = {'observedOn': inventory['observedOn'], 'summary': summary,
           'matching': 'method + host + most-specific path template; query variants share one family; papi base /prod is removed for matching',
           'limitations': ['Observed success describes only the sampled session and parameters.',
                           'POST beacon persistence checks are described in video.md, independently of DevTools error status.',
                           'Generic resource-type templates are not enumerations of accepted resource types.'],
           'endpoints': endpoints, 'webObservations': web}
(DOCS / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')

labels = {'observed_success': '成功観測', 'observed_error_or_attempt': 'エラー／送信観測', 'source_only': 'コードのみ'}
lines = ['# Web API総索引', '',
         f"公開WebアプリのJavaScript {summary['sourceFiles']}本から、メソッド・パス・ホストで{summary['staticRouteFamilies']}種類の定義を整理した。実通信だけで見つかったルートも加え、索引は{len(endpoints)}種類。サーバー全体の全APIが公開されたという意味ではない。", '',
         '各行の詳細は [inventory.json](inventory.json) のソース定義と [catalog.json](catalog.json) の観測参照にある。初回の実通信一覧は [endpoints.md](endpoints.md)。全体の確認範囲は [coverage.md](coverage.md) を参照。', '',
         'ホスト `api` は `https://api.nnn.ed.nico`、`papi` は `https://papi.nnn.ed.nico/prod`。表のPAPIパスには `/prod` を重ねて付けない。複数の `{id}` はそれぞれ別のIDで、同じ値を入れるという意味ではない。定義内の引数名・クエリ式で対応を確認する。', '',
         '「成功観測」は少なくとも1件の2xx、「エラー／送信観測」は403・404や中断を含む実通信、「コードのみ」は未実行の定義。別権限・別パラメーターでの成功や互換性を保証しない。', '',
         '| 分類 | ルート数 | 成功観測 | エラー／送信観測 | コードのみ |', '| --- | ---: | ---: | ---: | ---: |']
for key, name in categories.items():
    group = [e for e in endpoints if e['category'] == key]
    if group:
        count = collections.Counter(e['verification'] for e in group)
        lines.append(f"| {name} | {len(group)} | {count['observed_success']} | {count['observed_error_or_attempt']} | {count['source_only']} |")

for key, name in categories.items():
    group = [e for e in endpoints if e['category'] == key]
    if not group:
        continue
    lines += ['', f'## {name}', '', '| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |', '| --- | --- | --- | --- | --- |']
    for e in group:
        status = labels[e['verification']]
        if e['observedStatuses']:
            status += ' ' + ', '.join(e['observedStatuses'])
        if e['sourceIndex'] is None:
            owners = '実通信のみ。定義の対応は未確定'
        else:
            defs = inventory['endpoints'][e['sourceIndex']]['definitions']
            owners = ', '.join(sorted({d['owner'] for d in defs if d['owner']})) or 'fetch／Beacon呼び出し'
            if any('expandedFrom' in d for d in defs):
                owners += '（パス生成処理を展開）'
        lines.append(f"| {e['host']} | {e['method']} | `{e['path']}` | {status} | {owners} |")

lines += ['', '## 定義ごとのクエリ・本文を確認する', '',
          '`inventory.json` の各ルートには `definitions[]` がある。`template` は元のパス式を引数名付きで表し、`queryTemplate` はURL内のクエリ、`parameters` は関数の引数、`requestExpression` はパスに続く引数である。GETではクエリ指定、POST等では本文指定、生成クライアントではoptionsの場合がある。', '',
          'これらは圧縮された配信コードの構文であり、型定義や必須条件ではない。`requestExpression: "e"` のような転送引数から本文形式を推測しない。`source`・`offsetUtf16` とソースのSHA-256で元の位置を確認できる。実測レスポンスの型は各 `*observations.json` にある。', '',
          'debug定義はブラウザ配信物内に存在したものを記録しただけで、実行していない。決済・顔認証・削除・投稿・提出も、コードだけの行を成功する仕様として扱わない。', '']
(DOCS / 'catalog.md').write_text('\n'.join(lines))
print(json.dumps(summary, ensure_ascii=False))
