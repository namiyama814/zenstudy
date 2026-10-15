# エンドポイント一覧

ベースURLは `https://api.nnn.ed.nico`。以下の初回調査29ルートはすべてネットワークで観測した。追加で確認した動画詳細・再生位置保存・視聴開始・離脱時のルートは [video.md](video.md) を参照。動画の書き込みには `papi.nnn.ed.nico/prod` も使われる。`{...}` はパス変数で、記載したクエリ値は画面が実際に送った例。省略時の既定値や受け付ける値の全範囲は未確認。

「公開200」は未ログイン時に200を観測した意味。「認証後200」はログイン後だけを確認した意味で、認証が必須と断定するものではない。個別のリクエストと構造は [observations.json](observations.json) を参照。

確認テスト・レポートのHTML取得と解答送信のルートは [tests-reports.md](tests-reports.md) に整理した。解答送信は配信コードで確認しており、成功通信を実測した一覧には含めていない。

## ホーム・アカウント・通知

| メソッド | パス | 観測クエリ | 用途・結果 |
| --- | --- | --- | --- |
| GET | `/v1/users` | `revision=2`、`with=authorized_clients&revision=2` | ログインユーザー。401→認証後200。`with` 付きは連携クライアント情報を追加 |
| GET | `/v1/users/bindings` | `revision=2` | アカウント連携一覧。認証後200 |
| GET | `/v1/notices/unreads` | なし | 未読通知。401→認証後200 |
| GET | `/v1/notices` | なし | 通知一覧。認証後200 |
| PUT | `/v1/notices/{noticeId}/mark` | なし | 既読化。通知一覧表示中に自動送信、204。JSON本文 `{}`、`csrf-token` あり |
| GET | `/v3/notices/importants` | なし | 重要通知。公開200。観測した本文は `{"importants":[]}` |
| GET | `/v2/announcements` | なし | アナウンス。公開200。観測した本文は `{"announcements":[]}` |
| GET | `/v1/official_events/unreads` | なし | ホームで取得するイベント情報。認証後200、`{"official_events":[]}` |
| POST | `/v1/tokens/csrf` | なし | CSRFトークン取得。201。観測リクエストは本文なし |

`/v1/users` はJSONのルートにユーザー項目を返す。`{"user": ...}` というラッパーはない。通知は `notices[]`、連携情報は `bindings[]` に入る。

## ジャンル・コース・教材

| メソッド | パス | 観測クエリ | 用途・結果 |
| --- | --- | --- | --- |
| GET | `/v3/material/genres` | なし | サイドバーのジャンル一覧。公開200 |
| GET | `/v2/material/packages/{packageId}` | なし | ジャンル内の科目分類とコース。例: `2`。公開200 |
| GET | `/v2/material/recommendations` | なし | ホームのおすすめコース。公開200 |
| GET | `/v2/material/courses/{courseId}` | `revision=1` | コースとチャプター一覧。課外 `2140` は公開200、必修 `2459` は認証後200 |
| GET | `/v2/material/courses/{courseId}/chapters/{chapterId}` | `revision=1` | 教材・関連授業一覧。課外 `2140/27051` は公開200、必修 `2459/32018` は認証後200 |

画面 `/genres/2` に対応するAPIは `/v2/material/packages/2`。`genres` 応答の `packages[].id` を使う。`recommendations[]` は `header` と `courses[]` を持つグループの配列。

教材本文は以下のWebホストの通信で確認した。これらは上記29ルートの件数に含めない。

| ホスト | メソッド・パス | 観測内容 |
| --- | --- | --- |
| `www.nnn.ed.nico` | `GET /contents/links/{linkId}` | 教材のiframe。例: `517507`（ガイド）、`519147`（演習） |
| `www.nnn.ed.nico` | `GET /contents/guides/{guideId}/content` | ガイド本文のHTML。例: `7427`、200 |

`/contents/links/` の観測クエリは `content_type=n-yobi&se_volume=100&enable_layout_2026_phase1=true`。教材一覧が返す `content_url` のIDはセクションIDと異なる。例: セクション `7427` のリンクIDは `517507`。IDの置き換えで本文URLを組み立てず、応答のURLをたどる。

## マイコース・レポート・学習量

| メソッド | パス | 観測クエリ | 用途・結果 |
| --- | --- | --- | --- |
| GET | `/v3/dashboard/my_courses` | `service=basic&limit=20&offset=0`、`service=advanced&limit=20&offset=0` | 必修／課外タブのコース一覧。認証後200 |
| GET | `/v2/dashboard/report_progresses` | なし、`service=basic` | 月別レポート進捗の概要。認証後200 |
| GET | `/v2/dashboard/report_progresses/monthly/{year}/{month}` | `service=basic` | 月別詳細。例: `2026/10`。認証後200 |
| GET | `/v2/learning_amounts` | なし | 合計・日別・平均の学習量。認証後200。量の単位は未確認 |
| GET | `/v3/dashboard/scale_scores` | なし | ユーザー画面で取得する教科別スコア。認証後200 |
| POST | `/v3/learning_events` | なし | 授業画面から自動送信された学習イベント。201、応答 `{}` |

学習イベントの観測本文（IDのみプレースホルダーに変更）:

```json
{"learning_material_type":"lessons","learning_material_id":"{lessonId}","service":"advanced"}
```

`learning_material_id` はこのリクエストでは文字列。`Content-Type: application/json` と `csrf-token` を送っていた。イベントを手動で再送していないため、ほかの教材種別、重複時の挙動、視聴進捗との関係は未確認。

## ライブ授業・アーカイブ

| メソッド | パス | 観測クエリ | 用途・結果 |
| --- | --- | --- | --- |
| GET | `/v1/lessons` | `mode=schedule&taken=false&limit=5`、`mode=after&taken=false&limit=15`、一覧では `limit=21` | 予定／過去の授業。公開200。`lessons[]` |
| GET | `/v1/lessons/search` | `q=特番&limit=20&offset=0`、次ページは `offset=20` | キーワード検索。認証後200。`total` と `lessons[]` |
| GET | `/v1/tags/lesson_search` | なし | 授業検索のタグ候補。公開200、`tags: string[]` |
| GET | `/v1/lessons/{lessonId}` | なし | 授業詳細・再生情報・参考資料。例: `482533614`。認証後200、`lesson` |

一覧の「もっと見る」は `base_id` を追加する。観測例:

```text
/v1/lessons?mode=schedule&taken=false&limit=21&base_id=482533505
```

検索の画面URL `page=2` は、APIでは `offset=20` になった。`taken=false` の意味はUIとの対応まで確定していない。`taken=true`、ほかの `mode`、並び順の指定は未検証。

授業詳細の `lesson.archive.url.hls` には署名付きHLS URLが入る。再生時は `cdn.fccc.info` の `.m3u8`、画質別 `.m3u8`、`.ts` にアクセスした。署名の実値や動画本体は保存していない。コメント接続用の `message_server` は応答に含まれたが、WebSocketプロトコルやメッセージ取得の仕様は未調査。

## フォーラム

| メソッド | パス | 観測クエリ | 用途・結果 |
| --- | --- | --- | --- |
| GET | `/v3/forum/menu` | なし | チャンネル一覧。公開200 |
| GET | `/v3/forum/channels/{channelId}/threads` | `with_channel=true`、`cursor=NDIwOTI%3D`、`resolved=false` | 一覧・追加読込・未解決フィルター。例: `6`。初期一覧は公開200、追加読込と絞込は認証後200 |
| GET | `/v3/forum/threads/{threadId}` | なし | 投稿詳細。例: `42416`。認証後200 |
| GET | `/v3/forum/material_relations/courses/{courseId}/chapters/{chapterId}/guides/{guideId}/threads/count` | なし | ガイドに関連する質問件数。例: `2140/27051/7427`。認証後200 |
| GET | `/v3/forum/material_relations/courses/{courseId}/chapters/{chapterId}/exercises/{exerciseId}/threads/count` | なし | 演習に関連する質問件数。例: `2140/27051/32820`。認証後200 |

追加読込は `channel_threads.cursors.next` を `cursor` に渡す。カーソルは応答の値をそのままURLエンコードする。`with_channel=true` の初期一覧には `channel_threads.channel` と `tags` が含まれた。未解決フィルターの200は確認したが、その本文構造は採取していない。
