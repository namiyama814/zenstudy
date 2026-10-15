# 動画再生・再生位置保存のAPI

2026-10-15に動画教材と授業アーカイブを追加調査した。動画教材は `api.nnn.ed.nico` からメタデータを取得し、`cdn.fccc.info` で再生する。再生位置の書き込み先は別ホストの `papi.nnn.ed.nico/prod`。再読み込みでの復元と、画面離脱時の保存も確認した。

根拠は [video-observations.json](video-observations.json) の20件の通信記録と再現チェック。以下では、実通信で確認した内容と、配信中のJavaScriptから読み取った内容を区別する。

必修本編のシーク上限・1倍への補正・終端判定は、追加調査の [必修動画の早送り・倍速制限](playback-restrictions.md) にまとめた。未完了本編の操作試験は行っておらず、制限ロジックは配信コードから確認している。

## 画面から再生URLへたどる

```text
画面 /courses/{courseId}/chapters/{chapterId}/movie/{movieId}
  ↓ iframe（ここでは movies と複数形）
www.nnn.ed.nico/contents/courses/{courseId}/chapters/{chapterId}/movies/{movieId}
  ↓ JSON取得
api.nnn.ed.nico/v2/material/courses/{courseId}/chapters/{chapterId}/movies/{movieId}?revision=1
  ↓ videos[].files.hls.url
cdn.fccc.info のマスタープレイリスト
  ↓ 画質別プレイリスト → .ts セグメント
動画再生
```

課外動画 `2140/27051/44241`、必修コース内の補足動画 `2459/32018/53456`、視聴済みの必修動画 `2459/32018/53457` で確認した。iframeのクエリは課外が `content_type=n-yobi`、必修側が `content_origin=n-yobi&content_type=monka`。共通で `se_volume=100&enable_layout_2026_phase1=true` が付いた。

## 実通信で確認したルート

`C` = courseId、`H` = chapterId、`M` = movieId、`L` = lessonId。表の `{C}` などはプレースホルダー。

| ホスト | メソッド・パス | 確認結果 |
| --- | --- | --- |
| `api.nnn.ed.nico` | `GET /v2/material/courses/{C}/chapters/{H}/movies/{M}?revision=1` | 200。動画詳細、署名付き再生URL、保存位置、再生設定 |
| 同上 | `GET /v2/material/courses/{C}/chapters/{H}/movies/{M}/playback?study_context_id={contextId}` | 200。保存位置の再取得。課外で確認 |
| `papi.nnn.ed.nico` | `PUT /prod/v2/material/courses/{C}/chapters/{H}/movies/{M}/playback` | 204。通常の再生位置保存。課外／必修側で確認 |
| 同上 | `POST /prod/v2/material/courses/{C}/chapters/{H}/movies/{M}/playback` | 再生中に教材を切り替えると送信。DevToolsは `ERR_ABORTED`、後続GETで保存を確認 |
| `api.nnn.ed.nico` | `PUT /v1/n_school/courses/{C}/chapters/{H}/movies/{M}/progress/start?new_session=false&study_context_id={contextId}` | 204。`basic_supplement` の視聴開始で確認。本文 `{}` |
| `papi.nnn.ed.nico` | `POST /prod/v3/material/courses/{C}/chapters/{H}/movies/{M}/session/terminate` | 一時停止中の補足動画から別教材へ移動すると送信。`ERR_ABORTED`、終了処理の成否は未確認 |
| `api.nnn.ed.nico` | `GET /v3/forum/material_relations/courses/{C}/chapters/{H}/movies/{M}/threads/count` | 200。動画教材の関連質問件数 |
| 同上 | `GET /v3/forum/material_relations/courses/{C}/chapters/{H}/lessons/{L}/threads/count` | 200。コース内から開いた授業の関連質問件数 |

CSRFトークンは既存の `POST /v1/tokens/csrf` で発行される。観測したPUTは `Content-Type: application/json` と `csrf-token` を送っていた。PAPIのプリフライト応答はOriginに `https://www.nnn.ed.nico`、許可ヘッダーに `content-type,csrf-token`、`Access-Control-Allow-Credentials: true` を返した。

## 動画詳細はラッパーなしで返る

`GET .../movies/{M}?revision=1` のルートに直接 `id` や `videos` が入る。`movie` ラッパーはない。

| フィールド | 観測内容 |
| --- | --- |
| `id`, `title`, `tags`, `writing_mode` | 動画ID、名称、タグ、教材の組方向 |
| `profile_type` | `advanced`, `basic_supplement`, `basic` |
| `length` | 秒単位の尺。例: 820。プレイヤーの実尺には小数部があった |
| `playback_position` | 保存位置。ミリ秒単位と実測で確認 |
| `playback_at` | 保存済みの場合に観測。タイムゾーン付きの日時文字列 |
| `playback_settings` | 保存・再開位置に関する設定。下表参照 |
| `progress_status` | 今回は `none` と `passed`。保存位置とは別項目 |
| `permissions` | 課外で `section_use.active`、必修側で `vr_use.active` を確認 |
| `references[]` | `reference_type` と `content_urls[]`。HTML参考資料やスライド画像 |
| `videos[]` | `video_type`, `stereoview`, `files` |
| `videos[].files` | `hls.url` と `mp4.url`。今回はHLSで再生し、MP4は取得していない |
| 必修側の追加項目 | `textbook_info`, `vr_length`, `vr_rank` |

観測した設定値:

```json
{
  "periodic_record_interval": -1,
  "api_cooldown": 15000,
  "record_diff_condition": 10000,
  "resume_adjustment": 5000
}
```

`api_cooldown`・`record_diff_condition`・`resume_adjustment` は配信コードでも時間単位を変換して使っており、ミリ秒として解釈される。今回の値では15秒のクールダウン、前回送信位置との差が10秒を超える条件、5秒の巻き戻しに対応する。`periodic_record_interval: -1` の動作は今回読んだ動画コンポーネントでは確定できず、周期送信があるとは記載しない。

## 保存位置はミリ秒、再開は5秒手前

通常保存の観測本文（セッション識別子は置換）:

```json
{"position":130000,"study_context_id":"{contextId}"}
```

課外動画で以下を確認した。

1. 再生後に停止すると、`position: 19000` が送られた。
2. 120秒へシークして再生し、約130.9秒で停止すると `position: 130000` が送られた。
3. 動画詳細を再取得すると `playback_position: 130000` が返った。
4. ページを再読み込みすると、約125秒を起点に再生が再開した。数秒後に停止した時点の `currentTime` は約127.7秒だった。

保存値が秒を整数化してからミリ秒に変換されたように見えるが、全ての端数処理を確定したものではない。再開位置については配信コードにも「保存位置から `resume_adjustment` を引き、0未満にしない」処理があり、実測と一致した。

位置取得APIの応答構造:

```text
id: number
playback_position: number
playback_at: string
playback_settings:
  periodic_record_interval: number
  api_cooldown: number
  record_diff_condition: number
  resume_adjustment: number
```

観測したPUTの一部は204と同時に `net::ERR_ABORTED` が表示され、本文も取得できなかった。後続GETで位置が更新されていたため、DevToolsの表示だけで保存失敗と判断しない。

## 離脱時はsendBeaconで保存する

再生中の課外動画からガイドへ切り替えると、同じ保存パスにPOSTが送られた。

```json
{
  "position": 241000,
  "clear_session": true,
  "token": "{csrfToken}",
  "study_context_id": "{contextId}"
}
```

配信コードでは `navigator.sendBeacon` と `application/json` のBlobを使う。通常PUTでヘッダーに入るトークンが、Beaconでは本文の `token` に入る。上記POSTは `ERR_ABORTED` と記録されたが、その後の動画詳細は `playback_position: 241000` を返した。

一時停止中の補足動画から移動した際には、別の `session/terminate` へPOSTが送られた。本文は `token: string` と `study_context_id: string`。この終了リクエストについては、サーバー側の処理成功まで確認していない。

## 操作と通信の関係

| 操作 | 実測・コードから分かったこと |
| --- | --- |
| 動画を開いて再生 | 詳細取得、CSRF発行、保存位置のPUTを確認。必修側では学習イベントも確認 |
| 一時停止 | 条件を満たすと現在位置をPUT。コード上、差分とクールダウンを考慮するため毎回とは限らない |
| シーク | 課外で120秒／200秒へ移動して確認。コード上、シーク完了時にも保存判定を行う |
| 一時停止後に再生 | `GET .../playback` の再取得を確認。常に発生するかはクールダウン等に依存 |
| 速度変更 | UIで1.5倍に変更し `HTMLMediaElement.playbackRate` が1.5になった。専用APIは観測せず |
| ページ再読み込み | 保存位置の5秒手前から再開。今回の動画と設定で確認 |
| 別教材へ移動 | 再生中はPOSTによる位置保存、一時停止中はセッション終了POSTを観測 |

再生速度は `localStorage["zane:video-playback-rate"]` に保存されていた。調査後はUIで1倍へ戻した。画面が隠れたときの位置送信、`pagehide` 時の位置保存／セッション終了の分岐もコードにあるが、非表示操作を使った個別の通信試験は行っていない。

補足動画で観測した学習イベントは以下。通常の授業アーカイブの `learning_material_type: "lessons"` と区別する。

```json
{
  "learning_material_type": "movies",
  "learning_material_id": "{movieId}",
  "service": "basic",
  "course_id": 2459,
  "chapter_id": 32018
}
```

## HLSは3画質のプレイリストを返した

課外動画のマスタープレイリストで確認した値:

| 解像度 | BANDWIDTH |
| --- | --- |
| 480×270 | 1,104,000 |
| 640×360 | 1,825,000 |
| 1280×720 | 3,350,000 |

CODECSはH.264とAAC。画質別のプレイリストは `EXT-X-VERSION:3`、`EXT-X-TARGETDURATION:6` で、実際の `EXTINF` は約3秒や約6秒だった。ファイル名には `600k`, `1m`, `2m` が見られたが、表の帯域値と同一とは限らない。

授業アーカイブも480×270・640×360・1280×720の3画質だったが、帯域値やマニフェストのタグは動画教材と異なった。プレイヤーが画質別プレイリストを切り替える通信を観測した。手動の画質指定UIは今回操作していない。

再生URLには `Expires`, `Key-Pair-Id`, `Policy`, `Signature` が付いていた。動画詳細から毎回取得する前提にし、署名値やセグメント本体は資料へ保存しない。署名の生成・更新方式、期限切れ時の再試行、MP4再生は未確認。

## 視聴完了・競合制御はコード上の確認にとどまる

配信中の `ohtomi@9.21.0` の動画コンポーネントとAPIクライアントを読んだ。根拠となるJSのURLは `video-observations.json` の `sourceInspection.sources` に記録した。次の仕様はコードからの読み取りで、成功する通信を実測したものではない。

- `PUT /v1/n_school/courses/{C}/chapters/{H}/movies/{M}/progress/passed`。視聴完了時の処理に現れる。今回は終端へシークしたり完了状態を作ったりしていない。
- 再生完了を表す保存位置 `-1`。通常の経過ミリ秒とは別の値として分岐する。
- `clear_session` は通常PUTのクライアントにも定義されている。通常PUTでの送信は未確認。
- 再生位置保存の409では `urn:zane:problem-type:movie-sessions:` に続く `no-session-error`, `another-session-error`, `playback-position-error` を処理する。エラーを意図的に発生させていない。
- 位置取得の401／409、開始処理の400／409、完了処理の400／409に対応する分岐がある。網羅的なサーバーエラー仕様ではない。
- 未完了の `basic`／`zen_univ` にセッション制御を適用する分岐がある。今回の `basic` は視聴済み、未完了動画は `basic_supplement` だったため、未完了の必修動画の制限を一般化しない。

授業アーカイブ用の `GET /v2/material/courses/{C}/chapters/{H}/lessons/{L}/playback` と、PAPIの `PUT /prod/v2/material/courses/{C}/chapters/{H}/lessons/{L}/playback` もAPIクライアント内にある。単独の `/lessons/{L}` とコース内の授業URLの双方で再生・停止を試したが、今回この2ルートの実通信は観測できなかった。動画教材の保存仕様をそのまま授業アーカイブへ当てはめない。

調査終了時点で動画は停止した。今回の操作で再生位置と学習イベントは更新されたが、未完了の必修動画を完了扱いにする操作、理解度変更、解答、提出は行っていない。
