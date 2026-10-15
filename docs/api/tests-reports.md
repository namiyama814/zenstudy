# 確認テスト・レポートのAPI

2026-10-15に確認テストとレポートを追加調査した。必修の問題・提出済み結果は `www.nnn.ed.nico/contents/` のHTMLとして取得され、解答送信は `api.nnn.ed.nico` のJSON APIを使う実装だった。閲覧時のGETは実通信で確認したが、解答・採点・提出・再提出のPOSTは実行していない。

[tests-reports-observations.json](tests-reports-observations.json) に15件のGET観測と、HTMLに埋め込まれた項目の型を保存した。以下の送信API・送信形式・エラー処理は、別記のとおり配信JavaScriptからの確認である。点数、提出済み解答、講師コメント、問題本文、模範解答の実値は保存していない。

## 確認テストとレポートは4種類に分かれる

| 画面の種類 | 外側の画面URL末尾 | 本文・APIで使う名前 | 今回のID |
| --- | --- | --- | --- |
| 記述／選択の確認テスト | `/evaluation_test/{id}` | `evaluation_tests` | `7660` |
| 選択・記述式レポート | `/evaluation_report/{id}` | `evaluation_reports` | `1809` |
| 論述の確認テスト | `/essay_test/{id}` | `essay_tests` | `3487` |
| 論述式レポート | `/essay_report/{id}` | `essay_reports` | `1812` |

外側の共通部分は `/courses/{courseId}/chapters/{chapterId}`。今回の必修コースは `2459`、チャプターは `32018`。画面は単数形、iframeや送信先は複数形を使う。

章一覧の `chapter.sections[]` にある `resource_type`・`id`・`content_url` を使って対象を特定する。`evaluation_tests` と `short_tests` は別の機能で、同じ「テスト」としてURLを組み立てない。

## 問題と結果のGETはHTMLを返す

ホストは `https://www.nnn.ed.nico`。`{kind}` は上表の複数形。

| メソッド・パス | 確認内容 |
| --- | --- |
| `GET /contents/courses/{C}/chapters/{H}/{kind}/{id}` | 入力画面または既存結果。4種類で200を確認 |
| `GET /contents/courses/{C}/chapters/{H}/{kind}/{id}/result` | 提出済み結果。4種類で200を確認 |

ここで `{C}` はcourseId、`{H}` はchapterId。本文のContent-Typeは `text/html; charset=utf-8`。初回のiframeには `content_type=monka&se_volume=100&enable_layout_2026_phase1=true` が付いていた。既存リソースへの同じGETをクエリなしで取得した場合も200になった。

提出済みの確認テストで「再受講する」を押すと、iframe内で `/result` のないパスへGETで移動した。`rails-init.isResult` はfalseになり、「答え合わせ」がある入力画面になった。この操作で解答POSTは送られていない。外側のiframe要素の `src` が元の結果URLのままでも、iframe内の `location.pathname` は移動していたため、現在地の確認には後者を使う。

一方、提出済みの論述確認テストは、`/result` のないURLへGETしても `isResult: true` の結果HTMLを返した。パスから `/result` を外すだけで再提出可能になるとは判断できない。

## HTMLから初期設定と結果データを読み取る

初期設定は `<script id="rails-init" type="application/json">` にある。

```text
understand: string
csrfToken: string
tenjinApiPrefix: string
tags: array
isLink: boolean
isResult: boolean
courseId: number
chapterId: number
isNSchool: boolean
material:
  title: string
  tags: array
  link: boolean
  type: string
  id: number
  writingMode: string
```

`csrfToken` は秘密値として扱う。各画面はKokubanのJavaScriptで問題のHTMLを読み取り、入力・結果UIを描画する。観測したフォーム画面では、独立した「問題JSON取得API」の通信は発生しなかった。

結果や提出状態は次の属性のJSONに埋め込まれていた。

| 種類 | 属性名 | 観測した項目 |
| --- | --- | --- |
| 記述／選択の確認テスト | `data-evaluation-test-params` | `passed`, `result.first`, `result.latest`, `answerings[]`, `correctnesses[]`, `total_score` |
| 選択・記述式レポート | `data-evaluation-report-params` | 上と同じ。入力画面では `missed` も確認 |
| 論述確認テスト | `data-essay-test-params` | `result.answered_at`, `result.score`, `answerings[]`, `total_score` |
| 論述式レポート | `data-essay-report-params` | `result.answered_at`, `result.score`, `answerings[]`, `teacherComments[]`, `total_score` |

`result.first` と `result.latest` の観測型はそれぞれ `{passed: boolean, score: number, answered_at: number}`。`answerings[]` は文字列、`correctnesses[]` はbooleanだった。配信コードは `answered_at` に1000を掛けて日時を作っており、Unix秒として処理している。

論述確認テストの `result.score` は今回null、論述式レポートではnumberだった。nullの理由は応答だけでは確定できない。`teacherComments[]` は文字列配列だが、すべての論述教材に存在するとは限らない。

論述式レポートの入力HTMLでは、paramsは `{missed: boolean}` だけだった。選択記述式では、`isResult: false` の入力HTMLにも過去の結果や解答を含むparamsが残っていた。入力状態・履歴・提出可否は別々に判断する。

## 解答送信APIはコードで確認した

以下のPOSTは配信中のAPIクライアントと呼び出し側で確認した。実際には送信しておらず、成功ステータス・応答本文・サーバーの検証条件は未確認。

ホストは `https://api.nnn.ed.nico`。

| 種類 | メソッド・パス | コード上の本文 |
| --- | --- | --- |
| 記述／選択確認テスト | `POST /v1/n_school/courses/{C}/chapters/{H}/evaluation_tests/{id}/answerings` | `{answerings: string[]}` |
| 選択・記述式レポート | `POST /v1/n_school/courses/{C}/chapters/{H}/evaluation_reports/{id}/answerings` | `{answerings: string[]}` |
| 論述確認テスト | `POST /v1/n_school/courses/{C}/chapters/{H}/essay_tests/{id}/answerings` | `{answerings: string[]}` |
| 論述式レポート | `POST /v1/n_school/courses/{C}/chapters/{H}/essay_reports/{id}/answerings` | `{answerings: string[]}` |

選択記述式は、小問の並び順に文字列を詰める実装。選択肢は数字を文字列化し、記述欄は入力文字列を使っている。結果描画側は選択値を `parseInt(...)-1` で配列の添字に戻している。サーバーが受理する入力の全範囲は未検証。

論述系も入力文字列の配列を `{answerings: ...}` で包む。本文中にcourseIdやchapterIdを重ねて入れる実装ではなく、URL側へ含めていた。

コード上、成功時は現在の本文パスへ `/result` を追加してHTMLを取得し、`history.pushState` と画面の再描画を行う。したがって、送信APIのJSON応答だけで結果画面が完成する構造ではない。

## CSRF・一時保存・再送の処理

KokubanのAPIクライアントは `rails-init.tenjinApiPrefix` と `csrfToken` を初期値に使い、`withCredentials: true` と `CSRF-TOKEN` ヘッダーを設定する。通常の変更系APIと同じくCSRFを使うが、この画面の初期トークンはHTML由来である。

配信コードにあったエラー処理は以下。実際のエラー応答を発生させたものではない。

- 422かつ `error.csrf` が存在する場合は、新しいCSRF情報を検証し、トークンを更新して元のリクエストを再送する。
- ネットワーク状態が0、またはHTTP 408の場合に再試行する設定がある。待ち時間は指数的な増加と乱数を使う。最大試行回数は今回未確認。
- 論述系の送信では409を「すでに提出しています。」として表示する分岐がある。
- レポートでは `params.missed` を参照して期限超過の確認を表示する。期限の判定基準や、超過時にサーバーが受理する条件は未確認。

解答の一時保存は、今回読んだ実装ではサーバーAPIではなく、`localStorage` の `tempSavedAnswer` キーを使う。

```text
courseId: number
chapterId: number
resourceType: string
sectionId: number
answers: 教材ごとの解答配列
```

復元時に教材の種類・ID・解答数を検証し、送信成功時に一時保存を消す処理がある。今回入力操作はしていないため、一時保存の読み書きや削除は実測していない。既存の一時保存の値も取得・変更していない。

## 課外の演習は送信形式が異なる

課外の選択演習 `/courses/2140/chapters/27051/exercise/32820` は、`/contents/links/519147` のiframeとして表示された。UIには「答え合わせ」があるが、選択や送信は行っていない。

この選択演習の配信コードでは、以下のルートと本文を組み立てていた。

```text
POST https://api.nnn.ed.nico/v1/material/exercises/{exerciseId}/answers

answers: array
  position: number（小問の1始まりの順番）
  content: number[]（この選択式では選択肢の1始まりの番号）
```

これは必修の `answerings: string[]` と別形式。課外の論述演習用には `POST /v1/material/courses/{C}/chapters/{H}/essay_tests/{id}/answerings` も定義されていたが、対象の画面や通信は今回確認していない。

## 制限時間付きテストはセッション型

コース `2000` のテスト入口 `/courses/2000/short_tests/728` を開くと、以下が実際に送られた。

```text
GET https://api.nnn.ed.nico/v1/material/short_tests/728?course_id=2000
→ 200
```

応答は `short_test` をルートに持つ。主な項目は `id`, `title`, `outline`, `resource_type`, `content_url`, `permissions`, `total_question`, `time_limit`, `released_at`。画面には「テストを始める」が表示された。今回は開始せず、時間制限のあるセッションを作成していない。

アプリのAPIクライアントには次のルートがある。すべてコード上の確認にとどまる。

| メソッド・パス | コード上の用途 |
| --- | --- |
| `POST /v1/material/short_test_sessions` | セッション開始 |
| `GET /v1/material/short_test_sessions/{sessionId}` | セッション取得 |
| `POST /v1/material/short_test_sessions/{sessionId}/answering` | 解答送信。`answering` は単数形 |
| `GET /v1/material/short_test_sessions/{sessionId}/result` | セッション結果 |

送信側では `answerings[]` の各要素に `exerciseId` と `answers` を置き、各解答を文字列の配列へ包んでいた。必修の確認テストと本文形式を共有しているとは扱わない。

定期テストにも別途 `/v3/schools/courses/{C}/assessment_tests/{id}` と `assessment_test_sessions` 系のクライアント定義がある。今回は受験画面・開始・提出を確認していないため、上のルートや応答型を流用しない。

## 再調査で確認すること

今回の通信で確定したのは、各種類の取得経路、HTML初期データと結果の項目、診断テスト入口のJSON構造。送信ルートは配信JavaScriptから確認した候補である。

送信まで検証する際は、提出してよい練習データで、POST本文・HTTPステータス・結果HTML・履歴や進捗の変化を対にして記録する必要がある。未提出／差し戻し／再提出、添付ファイル、期限超過、採点待ち、定期テストのセッション仕様は未確認。

調査後は確認テストの結果画面へ戻した。今回、解答入力・答え合わせ・レポート提出・再提出・テスト開始は行っていない。
