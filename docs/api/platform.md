# アカウント・検索・履歴・フォーラム・周辺API

網羅調査で追加した読み取りAPIと、配信コードにある変更系の契約を整理する。全ルートは [総索引](catalog.md)、元の引数・クエリ式・出典位置は [inventory.json](inventory.json)、実測型は [coverage-observations.json](coverage-observations.json) を参照。

この資料で「コード上」と書いた操作は実行していない。クライアントが組み立てる形と、サーバーが必須とする仕様は分けて読む。

## 認証入口とアカウント連携

既存ログインを維持したまま、別の隔離ブラウザコンテキストで `/login` と `/register` の200を確認した。ログインページは次のリンクを表示する。

```text
GET https://www.nnn.ed.nico/oauth_login
  next_url=https://www.nnn.ed.nico/home（URLエンコード）
  target_type=n_lobby | zen_id | niconico | apple
```

`n_lobby` はN高グループ、`zen_id` はZEN大学、`niconico` はニコニコ、`apple` はAppleの入口。登録ページのニコニコ／Appleも `/oauth_login` を参照していた。これはリンク先を確認したもので、今回OAuth認可を開始・完了したわけではない。state、認可コード、callback、Cookie設定、更新・失効の契約は未確認。

連携一覧は `GET /v1/users/bindings?revision=2`。`bindings[]` は `target_type`, `nickname`, `display_name`, `id` を持つ。コード上の解除は `DELETE /v1/users/bindings?target_type=...`。外部クライアントの解除には `DELETE /v1/oauth/authorized_clients/{id}` もある。解除・ログアウトは行っていない。

CSRFのネットワーク応答は `token`, `expire_time`。クライアント内では `expireTime` を1000倍して `Date.now()` と比較するコードがあり、内部値をUnix秒として扱っている。クライアントのプロパティ名とwire上の項目名を混同しない。

## プロフィールと学校検索

| GET | 観測した応答 |
| --- | --- |
| `/v1/users?revision=2` | ユーザー項目がルートに入る。詳細は既存資料参照 |
| `/v1/users/private_profile` | `zane_user_id`, `birthday`, `sex` |
| `/v1/profiles/school` | 学年・所属・進路の選択値。下記参照 |
| `/v1/schools` | `schools[]` ではなく `jobs[]`。各要素に `id`, `name` |
| `/v1/search/colleges?q=東京` | `total`, `colleges[]` |
| `/v1/search/highschools?q=東京` | `total`, `highschools[]` |
| `/v1/search/colleges/{id}` | 所属と目標の画面で200を確認。実際の選択IDは保存していない |
| `/v1/search/highschools/{id}` | 同上 |

所属・目標の応答には以下が含まれた。

```text
zane_user_id, job_or_grade_id, highschool_id
first_choice_college_id, first_choice_faculty
second_choice_college_id, second_choice_faculty
third_choice_college_id, third_choice_faculty
desired_course_id, will_continue_to_college, persisted
```

今回、学校・大学のIDに文字列、未設定値にnull、希望コースIDにnumberを観測した。IDを一律に数値化しない。誕生日や志望校の実値は資料に記録していない。

コードに定義された書き込みは `PUT /v1/users?revision=2`、`PUT /v1/users/private_profile`、`PUT /v1/profiles/update_school`。これらのクライアントは引数を転送するため、GETの全項目がそのまま書き込み可能とは判断しない。`DELETE /v1/users` も定義にあるが、実行していない。

## 教材は一括取得にも対応する

ホームの履歴表示で、個別取得以外に次のGETを観測した。

```text
/v2/material/courses?mode=batch&ids[]=2459&ids[]=2140
/v2/material/chapters?queries[][course_id]=2459&queries[][chapter_id]=32018
                     &queries[][course_id]=2140&queries[][chapter_id]=27051
/v1/lessons?mode=batch&ids[]=482533614
```

実際の送信では角括弧がパーセントエンコードされる。チャプターの `queries` はcourseIdとchapterIdのペアの配列で、単一の `ids[]` に置き換えない。応答のルートはそれぞれ `courses[]`, `chapters[]`, `lessons[]`。

`GET /v2/material/packages` と `GET /v2/my_courses` は `services[]` を返した。既存の `/v3/dashboard/my_courses` と同じバージョン・構造とは限らない。履修年度ジャンル `110` も通常の `/v2/material/packages/110` で取得された。

年度・履修関係では以下の結果だった。

| パス | 確認範囲 |
| --- | --- |
| `/v3/material/genres/school_terms/{id}` | GETの定義を確認。今回有効なIDを特定せず未実行 |
| `/v3/material/genres/school_terms` | 定数文字列を確認しGETで調べたところ404。HTTPメソッドはソース定数から確定できない |
| `/v3/schools/genres/completed_subjects_genre` | GETで403 |

定数が残っていることだけを、現在利用可能なAPIの証拠にしない。

## 学習進捗と履歴検索

従来の月別レポートAPIに加え、コードに次のルートがある。

```text
GET /v3/dashboard/study_progress
POST /v3/learning_histories/search
```

`study_progress` は今回のセッションでは403だった。画面が同じ機能を利用する条件や、必要な所属・権限は未確定。

履歴検索のコード上の本文は以下。送信は実行していない。

```text
sections: array
  course_id
  chapter_id
  material_type
  material_id
lessons: 授業IDの配列
```

生成クライアントには `{body: ...}` というoptionsで渡されるが、wireのJSONが `{body: ...}` というラッパーを持つという意味ではない。クライアント内部の呼び出し形式とHTTP本文を区別する。

`POST /v2/material/actions` も定義されるが、今回本文の契約や送信時機を確定していない。`POST /v3/learning_events` の実測例は [動画](video.md) を参照。

## フォーラムはv1とv3が併存する

今回の画面はv3を使う。投稿履歴は `/questions/activity` という画面URLだが、通信先は `GET /v3/forum/my_threads`。応答は `cursors`, `total_thread_count`, `threads[]` で、チャンネル一覧の `channel_threads` ラッパーとは異なる。

投稿作成画面を開くと `GET /v3/forum/thread_params` が送られた。応答項目は `channels[]`, `locked_channel_ids[]`, `tags[]`, `locked_tags[]`, `material_titles`。投稿本文は入力・送信していない。

検索には次の名前の違いがある。

```text
画面: /questions/channels/6?keyword=数学
API:  /v3/forum/channels/6/threads?with_channel=true&query=数学
```

旧 `GET /v1/questions` は200で `total`, `questions[]` を返した。一方、`/v1/questions/search?q=数学`、`/v1/questions/activity`、`/v1/tags/question` は今回404。v1がすべて廃止済み、またはv1がすべて現在も使える、というどちらの結論にもできない。

v1の一覧では `is_resolved`, `answers_count`, `created_at`、v3では `resolved`, `reply_count`, `posted_at` が見られた。ユーザー項目もv1の `is_teacher` / `is_staff` とv3の `teacher` / `staff` で異なる。

## 投稿・返信・画像アップロードはコード上の契約

`POST /v3/forum/threads` の画面側は、次のオブジェクトを組み立てていた。ここではクライアント内のcamelCaseを示す。通信クライアントの変換後のwire本文は未実測。

```text
belongingChannels: [{id, categoryTags}]
tags: string[]
mainMaterialRelation?: {courseId, chapterId, materialType, materialId}
blocks: array
  {contentType: "text", content}
  {contentType: "image", content}
  {contentType: "code", content, contentMetadata: {language}}
```

画像ブロックはアップロード結果へ置き換えてから投稿する。返信は `POST /v3/forum/threads/{id}/replies` に `{blocks: ...}` を渡す。コードには返信の201成功処理と、400・401・402・404・409・422・433のエラー分岐があるが、これらの応答は実際に発生させていない。

画像アップロードのコード上の流れ:

1. `POST /v1/media` に `medium` を渡す。クライアント内では `service`, `serviceId`, `ext`, `convertMethod: "upload_image"` を設定する。
2. 応答の `medium.uploadUrl` へ画像をPUTする。ここは固定APIパスではなく、返されたアップロード先を使う。
3. `GET /v1/media` にジョブIDの配列を渡して完了を確認する。コードでは `media[0].status === "completion"` を見る。

プロフィール画像にも同じアップロード処理が使われる。顔認証用のアップロードとは別の処理である。今回は画像を選択・送信していない。

削除、解決、通報の定義も [総索引](catalog.md) に含めた。`DELETE /v3/forum/threads/{id}`、`PATCH /v3/forum/threads/{id}/resolved`、`POST /v3/forum/reports/{violation|infringement}` などは未実行。クライアント定義のある通報理由GETにもtype引数があるが、受理するenumは未確定。

## 通知・商品・問い合わせ・外部決済

通知の既読化は初回調査で実通信を確認済み。イベントには別途 `GET /v1/official_events/unreads` と `PUT /v1/official_events/{id}/read` の定義がある。イベントのread操作は実行していない。

商品一覧 `GET /v1/products` は200だった。`products[]` の観測項目は `id`, `name`, `appleProductId`, `amountList`, `transaction`, `isActive`。`amountList[]` には `taxExcludedAmount`, `taxIncludedAmount`, `currency` があり、金額オブジェクトは `default`, `min`, `max` を持っていた。価格の実値は保存していない。

`GET /v1/products/payments` は403だった。決済画面のコードには `POST https://tsales.nicovideo.jp/purchase` へのHTMLフォームもある。これはAPIホスト内のJSON APIではなく、外部の決済処理。購入、契約、解約は実行していない。購読管理先として `https://zenstudy.subs.nicovideo.jp/my/subscriptions` への参照も確認した。

問い合わせ画面は `GET /v1/contact_types` を使い、`contact_types[]` の要素は `type`, `description`。送信は `POST /v1/contacts` にフォーム値とユーザーIDを渡すコードだった。フォームの表示だけを確認し、確認・送信操作は行っていない。

## エラー形式は一種類ではない

従来の `{"error": ...}` に加え、403の応答で以下のルート項目を確認した。

```text
type, status, title, detail, instance, error, metadata
```

本文構造は [coverage-observations.json](coverage-observations.json) の403観測を参照。HTTPステータスだけ、または常に `error.code` だけで全ルートのエラーを扱えるとは限らない。403は今回の所属・契約・機能条件での結果であり、権限不足の具体的な原因を断定していない。404も同様に、削除済みAPIとまでは判定しない。
