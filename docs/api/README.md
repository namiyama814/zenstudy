# ZEN Study API調査

2026-10-15（日本時間）に画面の実通信と公開Webソースを調べ、[総索引](catalog.md) に134種類のAPIルートを整理した。68本のJavaScriptを解析し、成功観測50種類・エラー／送信観測9種類・コードのみ75種類を区別している。調査対象と限界は [coverage.md](coverage.md) を参照。

初回調査の29種類・43件の観測は [observations.json](observations.json) に保存している。追加の動画再生調査は [video.md](video.md) と [video-observations.json](video-observations.json) にまとめた。全体ではAPI実通信92件と教材HTML等14件を索引に照合した。

確認テスト・レポートは [tests-reports.md](tests-reports.md) に追記した。問題と結果のHTML取得、埋め込みデータ、コード上の送信APIを区別している。

教材の探索は `genres → packages → courses → chapters` の順に進む。本文は別の `/contents/` 画面で表示される。必修授業と課外授業では同じURL形式でもJSON構造が異なるため、実装時は `course.type` または `course_type` に応じて処理を分ける。

## 資料の構成

| 資料 | 内容 |
| --- | --- |
| [catalog.md](catalog.md) | 全134種類の機能別総索引と確認状況 |
| [coverage.md](coverage.md) | 網羅調査の対象、集計方法、未確認範囲 |
| [platform.md](platform.md) | アカウント、学校検索、一括取得、履歴、投稿、アップロード、決済 |
| [inventory.json](inventory.json) | 68本のソース情報、133種類の定義、引数・クエリ式・出典位置 |
| [catalog.json](catalog.json) | 全索引と実通信の対応。各観測ファイルへの参照 |
| [coverage-observations.json](coverage-observations.json) | 網羅調査で追加した28件のGET観測 |
| [endpoints.md](endpoints.md) | メソッド、パス、クエリ、画面との対応、認証の確認範囲 |
| [models.md](models.md) | 教材・進捗・授業・フォーラムの主要フィールド |
| [video.md](video.md) | 動画詳細、再生位置保存、再開、HLS、セッション制御 |
| [playback-restrictions.md](playback-restrictions.md) | 必修本編のシーク上限、倍速制御、完了判定、視聴セッション |
| [playback-restrictions-evidence.json](playback-restrictions-evidence.json) | 制限ロジックのソース情報と検索用アンカー |
| [video-observations.json](video-observations.json) | 動画調査20件の通信記録と再現チェック |
| [tests-reports.md](tests-reports.md) | 確認テスト・レポートの取得、結果データ、送信形式、一時保存 |
| [tests-reports-observations.json](tests-reports-observations.json) | テスト・レポート調査15件のGET記録とコード上の送信候補 |
| [investigation.md](investigation.md) | 再調査の操作順、観測根拠、副作用、未確認事項 |
| [observations.json](observations.json) | リクエスト単位のステータスと値を除いたレスポンス構造 |

## 接続先と認証

| ホスト | 観測した役割 |
| --- | --- |
| `https://www.nnn.ed.nico` | Webアプリ、教材本文、`/contents/links/` |
| `https://api.nnn.ed.nico` | JSON API。`/v1`・`/v2`・`/v3` が併存 |
| `https://papi.nnn.ed.nico/prod` | 動画の再生位置保存、離脱時のBeacon通信 |
| `https://cdn.nnn.ed.nico` | アプリのJS・CSS・画像など |
| `https://cdn.fccc.info` | サムネイル、HLSプレイリスト、動画セグメント |

`https://nnn.ed.nico/` は調査環境で `ERR_NAME_NOT_RESOLVED` になった。Web画面には `www` 付きのURLを使用する。

ログイン前の `GET /v1/users?revision=2` と `GET /v1/notices/unreads` は401、ログイン後は200になった。APIリクエストにはCookieが送られ、調べた通信に `Authorization` ヘッダーはなかった。Cookieによるセッション認証と考えられるが、必要なCookie名・有効期限・更新方法は未特定。

観測したCORSヘッダーは以下のとおり。ほかのOriginからの利用可否は検証していない。

```http
Access-Control-Allow-Origin: https://www.nnn.ed.nico
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Max-Age: 7200
Vary: Origin
```

変更系の通信では、先に `POST /v1/tokens/csrf` が201を返し、後続の通常リクエストが `csrf-token` ヘッダーを送っていた。動画のBeacon通信では本文の `token` に入る。トークン応答は `{ token: string, expire_time: number }`。クライアント内の `expireTime` はUnix秒として期限判定するコードを確認した。教材UIではHTML由来のトークンと422時の更新処理もあり、詳細は [tests-reports.md](tests-reports.md) を参照。

## エラーと利用権限

未ログイン時に観測した401の本文:

```json
{"error":{"code":401,"message":"Unauthorized","meta":{"dialog":"LOGIN_REQUIRED"}}}
```

教材一覧は未ログインでも200になる場合がある。その中の `permissions.section_use.active` が `false` なら本文を利用できるとは限らない。権限には `reason` と `meta.dialog` が含まれ、`LOGIN`・`PAYMENT` が観測された。フォーラムの権限は `allowed`・`problem_type` という別形式を使う。

## 観測記録を使う際の前提

この資料は、公開画面とユーザーがログインしたセッションで閲覧できた範囲を記録したもの。APIの公開提供・互換性保証は確認していない。各パラメーターの必須性、最大件数、レート制限、全エラー形式も未確認。

`observations.json` の構造はJSON Schemaではない。配列は先頭要素の型を採取しており、任意フィールドや後続要素の違いを網羅しない。`unobserved` は空配列で要素型が不明、`null` はその観測でnullだったことを表す。大きい本文がMCPの出力上限にかかった場合は、観測済みGETをブラウザから再取得して構造だけを抽出した。その区別は `shapeSource` に記載している。

まず読み取りAPIで画面と同じ階層をたどり、IDと `content_url` を応答から取得する。進捗・権限・必修／課外の違いを確認してからクライアントの型を定義するのがよい。
