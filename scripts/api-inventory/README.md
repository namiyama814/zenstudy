# ZEN Study Web API索引の生成

公開されたJavaScriptを構文解析し、API呼び出しの定義を抽出する。配信コードは実行せず、抽出したAPIルートへのアクセスも行わない。JavaScript本体はキャッシュだけに保存し、リポジトリへ含めない。

リポジトリのルートで実行する。

```sh
npm ci --prefix scripts/api-inventory
node scripts/api-inventory/extract.mjs --download --cache /tmp/zenstudy-api-cache --out docs/api/inventory.json
python3 scripts/api-inventory/render.py
```

Node.js、Python 3.9以降、curlが必要。`--download` を外すと、キャッシュに全ソースが存在する場合だけ実行する。現在の入口は2026-10-15に観測した本体JSを既定値として固定している。新しい配信物へ更新する場合は、ブラウザで確認したURLを `--main-url` に渡し、展開根拠も再確認する。

```sh
node scripts/api-inventory/extract.mjs --download --cache /tmp/zenstudy-api-cache-new --main-url 'https://cdn.nnn.ed.nico/tenjin_pc/assets/ohtomi/app.OBSERVED_HASH.js'
```

上の `OBSERVED_HASH` は説明用。推測したハッシュでアクセスせず、実際に観測したURLを使用する。教材UI3本も固定URLなので、更新時には `extract.mjs` 内の観測済みURLを置き換える。

## 出力

| ファイル | 内容 |
| --- | --- |
| `docs/api/inventory.json` | 配信ソース、ハッシュ、HTTP呼び出し、引数・クエリ式、パス文字列の残件 |
| `docs/api/catalog.json` | 静的定義と各観測ファイルへの参照、確認状況 |
| `docs/api/catalog.md` | 機能別の総索引 |

`render.py` は既存の `*observations.json` を読み取る。HTMLの取得記録はWeb観測として分け、APIのルート数に重複算入しない。PAPIの `/prod` はホストのベースパスとして照合時に除く。

`reviewed-expansions.json` は、授業の汎用パス生成関数と論述リソース種別を読んで作った展開情報。別バージョンへ無条件に使い回さない。

元の呼び出し式が引数を転送するだけの場合、抽出結果から必須フィールドやwireの型は確定できない。レスポンス型も静的コードから捏造しない。HTTPステータスは実通信の観測ファイルを根拠に表示する。
