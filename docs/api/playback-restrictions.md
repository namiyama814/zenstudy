# 必修動画の早送り・倍速制限

2026-10-15配信の `ohtomi@9.21.0` を調査した。未完了の必修本編では、プレイヤーが未視聴部分へのシークと倍速再生を制限する。さらに視聴開始・位置保存・完了のAPIと、複数画面の視聴セッション制御が組み合わされている。

以下は配信JavaScriptから確認した処理である。未完了の必修本編で制限を操作する試験や、異常な位置・完了状態の送信は行っていない。既存の実通信では、完了済みの `basic`、未完了の `basic_supplement`、課外の `advanced` を確認している（[動画API](video.md)）。サーバー内部の検証式は不明。

## 制限が有効になる条件

動画詳細の `profile_type`、`progress_status` と画面のプレビュー状態を使う。ルーターの `lt` がプレイヤーへ渡す `isRestricted` を決める。

| 種類 | プレイヤーのシーク・速度制限 | 視聴セッションの事前確認 |
| --- | --- | --- |
| `basic` | プレビューでなく、`progress_status != "passed"` のとき有効 | 同条件で有効 |
| `zen_univ` | 上記に加え、権限配列に `zenUnivStaff` がないとき有効 | 未完了かつ非プレビューで有効。ここには職員の除外条件がない |
| `basic_supplement` / `zen_univ_appendix` | この判定では無効 | 事前確認ラッパーは使わず、未完了・非プレビューなら初回再生時に開始APIを呼ぶ |
| `advanced` | この判定では無効 | この事前確認ラッパーでは対象外 |

「必修コースに属する動画はすべて制限」という判定ではない。本編と補足を区別し、視聴完了後はプレイヤーの制限を外す。補足の開始APIには最大100回・3秒間隔の再試行設定があるが、制限本編の開始処理とは別経路である。

根拠: 証拠JSONの `eligibility`, `sessionEligibility`, `sessionGuard`。プレビューや権限の分岐は配信コードの記録であり、権限変更やプレビューへの切り替えは試していない。

## シーク先は視聴済みの上限と比較する

共有プレイヤーのモジュール `5885` は、現在位置とは別に `maximumViewingPosition` を持つ。初期上限は、制限中なら動画詳細の保存位置を秒に変換した値、制限なしなら動画全体の尺になる。再開位置は保存位置から `resume_adjustment` を引いた値なので、視聴上限と再開位置は同じ変数ではない。

| イベント・処理 | コード上の挙動 |
| --- | --- |
| `seeking` / `seeked` | ウィンドウのキャプチャ段階で対象動画のイベントを監視。制限中、実位置が上限より0.125秒を超えて先なら上限へ戻す |
| `timeupdate` | 現在位置を秒の整数へ切り下げる。制限中でシーク中でなければ、上限から5秒以内の前進を通常の進行として上限へ反映し、それを超える前進は上限へ戻す |
| 再生位置の再取得 | 返ってきた保存位置で上限を更新し、再開用の巻き戻しを適用する。完了を表す保存位置には別分岐がある |
| 保存候補の判定 | `isSeekableArea`（整数化した現在位置が上限以下）を確認してから、位置差・クールダウンなどの条件へ進む |

0.125秒と5秒は異なるイベントで使うクライアントの許容差である。サーバーが許可する飛び幅や、任意の位置を受け付ける条件を表すものではない。

左右キーや10秒移動ボタンには位置を変更する処理があるが、最終的には同じ動画要素のシークイベントで上限を確認する。`End` キーの終端移動は制限中に実行しない。

根拠: `initializeSeekLimit`, `seekCorrection`, `playerControls`, `timeupdateAndRatechange`, `tolerance`。時間変換は `units`。

## 倍速はメニューとイベントの両方で制御する

制限中は動画上の速度メニューを表示しない。速度を上げ下げするキーボード操作も、プレイヤーの `isRestricted` が有効なら処理しない。

さらに対象動画の `ratechange` をウィンドウのキャプチャ段階で監視する。制限中に、許可速度一覧で正規化した速度が1倍と異なる場合は、動画要素とプレイヤー状態を1倍へ戻し、そのイベントの後続処理を止める。UIを隠すだけの実装ではない。

制限がなければ、選択した速度を `localStorage["zane:video-playback-rate"]` に保存する。動画メタデータ読み込み時の保存速度の復元も、制限中は行わない。通常の選択肢は0.5、0.75、1、1.25、1.5、1.75、2倍。速度変更専用APIは、これまでの通信では観測していない。

根拠: `hidePlaybackRate`, `playerControls`, `timeupdateAndRatechange`, `allowedRates`。

## 終端イベントにも完了判定がある

制限中は、動画要素の `ended` を受けただけではプレイヤーを完了状態へ移さない。次の条件を確認する。

1. プレイヤー状態・動画要素のどちらもシーク中でない。
2. 終端時の現在位置が、視聴済み上限から5秒以内にある。
3. 動画の尺と現在位置との差が5,000ミリ秒以下である。

この判定を通ってプレイヤーが `ended` 状態になると、ルーター側の完了処理へ進む。未完了の本編では `progress/passed` の結果を確認し、成功等の分岐を通った後に完了位置の保存と制限解除を行う。API失敗の分岐もあるため、「動画の終端表示＝サーバー上の完了確定」とは扱えない。

完了済み・課外には別の分岐がある。完了値の扱いは [video.md](video.md) に記載済み。今回、完了リクエストは送信していない。

根拠: `endedGuard`, `tolerance`, `completionFlow`。

## 視聴セッションとAPIの役割

| API | この制御との関係 | 確認範囲 |
| --- | --- | --- |
| `GET api /v2/material/courses/{C}/chapters/{H}/movies/{M}?revision=1` | 種類、進捗、保存位置、再生設定を取得 | 実通信とコード |
| `PUT api /v1/n_school/courses/{C}/chapters/{H}/movies/{M}/progress/start` | 視聴開始。`new_session` と `study_context_id` をクエリに渡す | 補足で204。本編の事前確認はコード |
| `GET api /v2/material/courses/{C}/chapters/{H}/movies/{M}/playback` | 保存位置を再取得。`study_context_id` を付ける | 課外の実通信とコード |
| `PUT papi /prod/v2/material/courses/{C}/chapters/{H}/movies/{M}/playback` | 現在位置と `study_context_id` を保存 | 実通信とコード |
| `PUT api /v1/n_school/courses/{C}/chapters/{H}/movies/{M}/progress/passed` | 視聴完了を通知 | コードのみ |
| `POST papi /prod/v3/material/courses/{C}/chapters/{H}/movies/{M}/session/terminate` | 離脱時のセッション終了 | 送信を観測。サーバーでの終了成功は未確認 |

`api` は `api.nnn.ed.nico`、`papi` は `papi.nnn.ed.nico`。再生中の離脱には、別途 `POST .../playback` のBeacon保存もある。本文・単位・CSRFの詳細は [動画API](video.md) を参照。

事前確認ラッパーはブラウザ内の競合を調べ、開始APIが成功すると視聴可能にする。開始APIの409は競合ダイアログへ進む。利用者が画面上で継続を選んだ場合の新しいセッション開始処理もある。

ブラウザ内では `sessionStorage` の `zane:studyContextId` と、両ストレージの `zane:multiTab`、`localStorage` の `zane:studyContextIds` を使う。教材情報から作ったハッシュとコンテキスト一覧を照合し、視聴可能な間は1秒間隔で整合性を確認する。不整合なら全画面を終了し、視聴制限画面へ進む。これは速度の上限判定とは別の処理である。

保存APIの409では、次のProblem Typeを区別するコードがある。

| `urn:zane:problem-type:movie-sessions:` に続く値 | クライアントの処理 |
| --- | --- |
| `no-session-error` | セッション不足として制限画面へ移動 |
| `another-session-error` | 同じくセッション不足の分岐へ移動 |
| `playback-position-error` | 位置検証エラーとして `error_state=failedPlaybackPosition` を付けて移動 |

これらはサーバーが位置やセッションを検証するための応答をクライアントが想定している証拠である。実際の拒否条件、経過時間との比較方法、許容差、端末をまたぐ競合の扱いは確認できない。異常リクエストを送って判定式を推定する試験は行っていない。

根拠: `sessionGuard`, `contextStorage`, `positionError`。

## 出典と再調査の範囲

[playback-restrictions-evidence.json](playback-restrictions-evidence.json) に、今回読み直した4本のソースURL・SHA-256・UTF-16位置・検索用アンカーを保存した。元の68本のソース一覧は [inventory.json](inventory.json)。ソース全文やセッション値は収録していない。

今回の追加調査で確認できたのは、制限条件、イベントごとの補正、速度制御、終端判定、APIエラー処理の接続である。未完了本編でのUI実測、サーバーの位置検証、大学職員権限、VR・モバイルアプリ固有の制御は未確認。API総索引の観測件数は既存の記録に基づき、このコード調査で成功観測へ格上げしていない。
