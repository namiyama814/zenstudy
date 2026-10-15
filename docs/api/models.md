# レスポンスの読み方

フィールド名は実通信から採取した。以下は主要項目の抜粋で、必須項目や全enum値を定義した型ではない。値の型は [observations.json](observations.json) にも記録している。

動画詳細の `playback_position`・`playback_settings`・`videos` と再生位置の単位は [動画API](video.md) を参照。動画の `playback_position` はミリ秒だが、授業の `start_at` や `archive.start_offset` などに同じ単位を仮定しない。

確認テスト・レポートの初期設定と結果はHTML内のJSON属性にも埋め込まれる。`answerings`、正誤、初回／直近結果、講師コメントの構造は [テスト・レポートAPI](tests-reports.md) を参照。

アカウント、学校検索、商品、問い合わせ、一括取得、v1／v3フォーラムの違いは [platform.md](platform.md) に追加した。

## 教材はジャンルから本文へたどる

```text
GET /v3/material/genres
  genres.{advanced,basic}.packages[].id
    ↓ packageId
GET /v2/material/packages/{packageId}
  package.subject_categories[].courses[].id
    ↓ courseId
GET /v2/material/courses/{courseId}?revision=1
  course.chapters[].id
    ↓ chapterId
GET /v2/material/courses/{courseId}/chapters/{chapterId}?revision=1
  課外: chapter.class_headers[].sections[]
  必修: chapter.sections[]
    ↓ content_url
www.nnn.ed.nico/contents/links/{linkId}
```

未ログイン時の `genres` には `advanced`、今回のログイン後には `basic` も含まれた。表示されるグループやコースはセッションで変わるため、固定リストにしない。

## 課外授業は理解度とチェックポイントを返す

課外コース `2140` では、`course.type` が `advanced`。コース応答は `course`、チャプター応答は `course_type`・`subject_completed`・`chapter` をルートに持つ。

| フィールド | 観測型 | 読み方 |
| --- | --- | --- |
| `course.id`, `chapter.id` | number | コース／チャプターID |
| `title`, `outline` | string | タイトル・概要 |
| `course.subject_category.title` | string | コースの科目分類 |
| `course.selected` | boolean | コースの選択状態 |
| `course.short_test` | object | `total_short_test`, `total_passed_short_test` |
| `progress.comprehension` | object | `limit`, `bad`, `good`, `perfect` |
| `progress.checkpoint` | object | `total`, `clear` |
| `progress.on_calculation` | boolean | 集計状態。階層によって含まれる |
| `chapter.class_headers[]` | array | 教材や関連授業のグループ |
| `class_headers[].name` | string | 観測値 `section`, `lesson` |
| `class_headers[].has_progress` | boolean | グループの進捗表示の有無 |
| `class_headers[].sections[]` | array | セクションまたは関連授業 |

教材セクションの `resource_type` は `guide`・`movie`・`exercise` を確認した。関連授業は `lesson`。セクションには `id`, `title`, `outline`, `content_url`, `permissions`, `progress` などが含まれ、動画では `length`, `minute`, `playback_position` も見られた。

`class_headers[].sections[]` は種類の異なるデータを含む。同じチャプター内でも、教材と関連授業を単一の固定型として扱わない。

権限の一例:

```json
{
  "section_use": {
    "active": false,
    "reason": "ログインが必要です",
    "meta": {"dialog": "LOGIN"}
  }
}
```

`package_select` はコースの選択操作に関する権限と考えられるが、選択・解除APIは実行していない。未ログイン応答にも `progress` や `selected` が含まれたため、これらの存在だけでログイン成功や実際の受講履歴を判断しない。

## 必修授業はレポート進捗とセクション一覧を返す

必修コース `2459` では、課外の `comprehension` / `checkpoint` と異なる進捗構造を確認した。

| 場所 | 主な項目 |
| --- | --- |
| `course.progress` | `total_count`, `passed_count`, `total_chapters`, `passed_chapters`, `total_materials`, `passed_materials`, `total_assessment_test`, `passed_assessment_test_count`, `on_calculation` |
| `course.chapters[].progress` | `total_count`, `passed_count`, `on_calculation`, `status` |
| `chapter` | `open_section_index`, `sections[]`, `progress` |
| `chapter.progress` | `total_count`, `passed_count`, `status` |
| `chapter.sections[]` の先頭要素 | `resource_type`, `id`, `title`, `passed`, `textbook_info`, `length`, `content_url`, `material_type`, `thumbnail_url`, `vr_rank`, `vr_length`, `permissions`, `playback_position` |

この観測では `chapter.class_headers` ではなく `chapter.sections` を使っていた。先頭セクションに `permissions.vr_use.active` があったが、ほかのセクションの項目を網羅したものではない。

## ダッシュボードは別の集計モデルを使う

`GET /v3/dashboard/my_courses` は `services[]` を返す。各サービスには `name`, `total_course_count`, `courses[]`, `periodic_exam_title` がある。コースの主な項目は `id`, `type`, `title`, `selection_status`, `selected`, `thumbnail_url`, `on_calculation`, `progress`, `comprehension`。

`courses[].progress` は `total_count`, `passed_count`, `total_assessment_test`, `passed_assessment_test_count` を持つ。必修では `comprehension` がnull、課外では `total_count`, `good_count`, `bad_count` を持つオブジェクトだった。教材APIの同名フィールドとは構造が異なる。

レポート概要は `service`, `alert`, `monthly_summaries[]` を返す。月別要約には `year`, `month`, `earliest_report_deadline` と、チャプター・定期テストの総数／完了数がある。

月別詳細の主な項目:

```text
service, year, month, thumbnail_url
total_chapter_count, passed_chapter_count
total_material_count, passed_material_count
total_assessment_test, passed_assessment_test_count
deadline_groups[]
completed_chapters[]
passed_assessment_tests[]
```

`completed_chapters[]` では `course_id`, `chapter_id`, 科目・コース・章の名称、`total_count`, `passed_count`, `exempted` を確認した。`deadline_groups[]` と `passed_assessment_tests[]` は今回の月別応答では空だった。

学習量APIは `total_amount`, `average_amount`, `daily_amount[]` を返し、日別要素は `date`, `amount`。スコアAPIは `kyoukas[]` に教科名と `latest_*`, `former_*` を返す。数値の単位・算出式は応答だけでは確定していない。

## 授業は状態に応じて再生情報を追加する

授業一覧は `lessons[]`、詳細は `lesson`、検索は `total` と `lessons[]` を返す。

主な授業項目は `id`, `title`, `outline`, `tags`, `teacher_name`, `start_at`, `planned_start_at`, `real_start_at`, `minute`, `broadcast_status`, `viewer_count`, `permissions`。`outline` の欠落や `real_start_at: null` も観測した。

`broadcast_status` は `before`・`after`・`archive` を確認した。授業一覧の `mode=after` と、各授業の `broadcast_status` は別の項目であり、過去一覧には `after` と `archive` の両方があった。

アーカイブ詳細の `archive` には以下の項目が含まれた。

| 項目 | 内容 |
| --- | --- |
| `url.hls` | 署名付き再生URL。値は保存しない |
| `total_audience`, `second`, `start_offset`, `show_comment` | 視聴者数、尺、再生開始オフセット、コメント表示設定 |
| `messages[]` | 今回は空配列 |
| `enquetes[]` | アンケート・選択肢。`choices[]` に `id`, `text`, `rate` |
| `controls[]` | `type`, `cmd`, `enquete_id`, `vpos` |
| `message_server` | コメント用の接続先・スレッド・`forks[]` |

一覧の `archive` には尺などが含まれても、詳細と同じ再生情報がそろうとは限らない。授業詳細には `references[]` と `subjects[]` もあり、参考資料と関連コースをたどれる。

`start_at`・`released_at` などの数値日時は、画面の日時と対応するUnix秒と考えられる。フォーラムの `posted_at` は `+09:00` を含む日時文字列だった。全APIで日時の型が統一されているとは仮定しない。

## フォーラムはカーソルと独自の権限形式を返す

メニューは `channel_groups[] → channels[]`。チャンネルには `id`, `name`, `type`, `category_tags`, `category_descriptions`, `recommended_tags`, `icon_url` がある。

チャンネル一覧は `channel_threads` の中に `cursors.next`, `total_thread_count`, `threads[]` を返す。`with_channel=true` では `channel` と `tags` も確認した。投稿の主な項目は `id`, `title`, `user`, `resolved`, `resolved_at`, `views_count`, `reply_count`, `thumbnails`, `belonging_channels`, `tags`, `posted_at`, `group`, `main_message`。

詳細応答は `thread`, `permissions`, `allowed_channel_ids`。`thread.main_message.blocks[]` に本文ブロックが入り、`content_type`, `content_metadata`, `content`, `deleted`, `report_url` などを持つ。今回の詳細では `reply_messages[]` は空だった。

```text
permissions.reply.allowed: boolean
permissions.reply.problem_type: string | null（観測型を合わせた表記）
permissions.resolve.allowed: boolean
permissions.resolve.problem_type: string | null（同上）
```

今回 `reply.problem_type` はnull、`resolve.problem_type` は文字列だった。`active` を使う教材権限と混同しない。投稿者名・ユーザーID・本文・添付URLの実値は資料に保存していない。
