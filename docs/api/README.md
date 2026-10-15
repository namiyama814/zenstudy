# ZEN Study API調査

2026-10-15（日本時間）に Chrome DevTools MCP で画面とネットワーク通信を調べ、初回調査で29種類のAPIルートを確認した。クエリ・ステータス違いを含む43件の観測を [observations.json](observations.json) に記録している。追加の動画再生調査は [video.md](video.md) と [video-observations.json](video-observations.json) にまとめた。

確認テスト・レポートは [tests-reports.md](tests-reports.md) に追記した。問題と結果のHTML取得、埋め込みデータ、コード上の送信APIを区別している。

教材の探索は `genres → packages → courses → chapters` の順に進む。本文は別の `/contents/` 画面で表示される。必修授業と課外授業では同じURL形式でもJSON構造が異なるため、実装時は `course.type` または `course_type` に応じて処理を分ける。

## 資料の構成

| 資料 | 内容 |
| --- | --- |
| [endpoints.md](endpoints.md) | メソッド、パス、クエリ、画面との対応、認証の確認範囲 |
| [models.md](models.md) | 教材・進捗・授業・フォーラムの主要フィールド |
| [video.md](video.md) | 動画詳細、再生位置保存、再開、HLS、セッション制御 |
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

変更系の通信では、先に `POST /v1/tokens/csrf` が201を返し、後続の通常リクエストが `csrf-token` ヘッダーを送っていた。動画のBeacon通信では本文の `token` に入る。トークン応答は `{ token: string, expire_time: number }`。`expire_time` の単位と更新条件は未確認。

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
