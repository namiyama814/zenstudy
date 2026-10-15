# Web API総索引

公開WebアプリのJavaScript 68本から、メソッド・パス・ホストで133種類の定義を整理した。実通信だけで見つかったルートも加え、索引は134種類。サーバー全体の全APIが公開されたという意味ではない。

各行の詳細は [inventory.json](inventory.json) のソース定義と [catalog.json](catalog.json) の観測参照にある。初回の実通信一覧は [endpoints.md](endpoints.md)。全体の確認範囲は [coverage.md](coverage.md) を参照。

ホスト `api` は `https://api.nnn.ed.nico`、`papi` は `https://papi.nnn.ed.nico/prod`。表のPAPIパスには `/prod` を重ねて付けない。複数の `{id}` はそれぞれ別のIDで、同じ値を入れるという意味ではない。定義内の引数名・クエリ式で対応を確認する。

「成功観測」は少なくとも1件の2xx、「エラー／送信観測」は403・404や中断を含む実通信、「コードのみ」は未実行の定義。別権限・別パラメーターでの成功や互換性を保証しない。

| 分類 | ルート数 | 成功観測 | エラー／送信観測 | コードのみ |
| --- | ---: | ---: | ---: | ---: |
| 認証・アカウント連携 | 4 | 2 | 0 | 2 |
| プロフィール・学校検索 | 13 | 8 | 1 | 4 |
| 教材・コース | 16 | 8 | 1 | 7 |
| 進捗・学習履歴 | 9 | 7 | 1 | 1 |
| 動画・再生セッション | 10 | 4 | 2 | 4 |
| 授業・コメント | 21 | 4 | 0 | 17 |
| テスト・レポート | 17 | 2 | 0 | 15 |
| フォーラム・通報 | 29 | 7 | 3 | 19 |
| 通知・アナウンス | 5 | 5 | 0 | 0 |
| イベント | 2 | 1 | 0 | 1 |
| 商品・決済 | 2 | 1 | 1 | 0 |
| 顔認証 | 1 | 0 | 0 | 1 |
| 問い合わせ | 2 | 1 | 0 | 1 |
| debug定義（未実行） | 3 | 0 | 0 | 3 |

## 認証・アカウント連携

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | DELETE | `/v1/oauth/authorized_clients/{id}` | コードのみ | deleteAuthorizedClients |
| api | POST | `/v1/tokens/csrf` | 成功観測 201 | updateCsrfToken |
| api | DELETE | `/v1/users/bindings` | コードのみ | deleteUsersBindings |
| api | GET | `/v1/users/bindings` | 成功観測 200 | getUsersBindings |

## プロフィール・学校検索

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | GET | `/v1/profiles/school` | 成功観測 200 | getProfilesSchool |
| api | PUT | `/v1/profiles/update_school` | コードのみ | putProfilesSchool |
| api | GET | `/v1/schools` | 成功観測 200 | getSchools |
| api | GET | `/v1/search/colleges` | 成功観測 200 | getSearchColleges |
| api | GET | `/v1/search/colleges/{id}` | 成功観測 200 | getSearchCollege |
| api | GET | `/v1/search/highschools` | 成功観測 200 | getSearchHighschools |
| api | GET | `/v1/search/highschools/{id}` | 成功観測 200 | getSearchHighschool |
| api | DELETE | `/v1/users` | コードのみ | deleteUser |
| api | GET | `/v1/users` | 成功観測 200, 401 | getUser |
| api | PUT | `/v1/users` | コードのみ | putUser |
| api | GET | `/v1/users/private_profile` | 成功観測 200 | getPrivateProfile, getUsersPrivateProfile |
| api | PUT | `/v1/users/private_profile` | コードのみ | putPrivateProfile, putUsersPrivateProfile |
| api | GET | `/v3/schools/genres/completed_subjects_genre` | エラー／送信観測 403 | getCompletedSubjectsGenre |

## 教材・コース

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | DELETE | `/v1/material/courses` | コードのみ | deleteAdvancedCourse |
| api | PUT | `/v1/material/courses/` | コードのみ | putAdvancedCourse |
| api | GET | `/v1/material/{id}/{id}` | コードのみ | getMaterial |
| api | PUT | `/v1/material/{id}/{id}/progress` | コードのみ | progress, putMaterialProgress |
| api | PUT | `/v1/n_school/courses/{id}/selected` | コードのみ | putNSchoolCourse |
| api | POST | `/v2/material/actions` | コードのみ | postMaterialActions |
| api | GET | `/v2/material/chapters` | 成功観測 200 | getChaptersBatch |
| api | GET | `/v2/material/courses` | 成功観測 200 | getCoursesBatch |
| api | GET | `/v2/material/courses/{id}` | 成功観測 200 | getCourse |
| api | GET | `/v2/material/courses/{id}/chapters/{id}` | 成功観測 200 | getChapter |
| api | GET | `/v2/material/packages` | 成功観測 200 | getPackages |
| api | GET | `/v2/material/packages/{id}` | 成功観測 200 | fetch／Beacon呼び出し |
| api | GET | `/v2/material/recommendations` | 成功観測 200 | getRecommendations |
| api | GET | `/v3/material/genres` | 成功観測 200 | getMaterialGenres |
| api | GET | `/v3/material/genres/school_terms` | エラー／送信観測 404 | 実通信のみ。定義の対応は未確定 |
| api | GET | `/v3/material/genres/school_terms/{id}` | コードのみ | getCurriculumBySchoolTermId |

## 進捗・学習履歴

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | GET | `/v2/dashboard/report_progresses` | 成功観測 200 | getReportProgress |
| api | GET | `/v2/dashboard/report_progresses/monthly/{id}/{id}` | 成功観測 200 | getReportProgressesMonthly |
| api | GET | `/v2/learning_amounts` | 成功観測 200 | getLearningAmounts |
| api | GET | `/v2/my_courses` | 成功観測 200 | getMyCourses |
| api | GET | `/v3/dashboard/my_courses` | 成功観測 200 | getDashboardMyCourses |
| api | GET | `/v3/dashboard/scale_scores` | 成功観測 200 | getDashboardScaleScores |
| api | GET | `/v3/dashboard/study_progress` | エラー／送信観測 403 | fetch／Beacon呼び出し |
| api | POST | `/v3/learning_events` | 成功観測 201 | postLearningEvents |
| api | POST | `/v3/learning_histories/search` | コードのみ | fetch／Beacon呼び出し |

## 動画・再生セッション

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | PUT | `/v1/n_school/courses/{id}/chapters/{id}/movies/{id}/progress/passed` | コードのみ | putMovieProgressPassed |
| api | PUT | `/v1/n_school/courses/{id}/chapters/{id}/movies/{id}/progress/start` | 成功観測 204 | putMovieProgressStart |
| api | GET | `/v2/material/courses/{id}/chapters/{id}/movies/{id}` | 成功観測 200 | getMaterialCoursesChaptersMovie |
| api | GET | `/v2/material/courses/{id}/chapters/{id}/movies/{id}/playback` | 成功観測 200 | getMaterialCourseChapterMoviePosition |
| papi | POST | `/v2/material/courses/{id}/chapters/{id}/movies/{id}/playback` | エラー／送信観測 net::ERR_ABORTED | fetch／Beacon呼び出し |
| api | PUT | `/v2/material/courses/{id}/chapters/{id}/movies/{id}/playback` | コードのみ | putMaterialCourseChapterMoviePosition |
| papi | PUT | `/v2/material/courses/{id}/chapters/{id}/movies/{id}/playback` | 成功観測 204 | putMoviePlayPosition |
| api | GET | `/v2/material/movies/{id}` | コードのみ | getMaterialMovie |
| api | DELETE | `/v3/material/courses/{id}/chapters/{id}/{id}/{id}/session` | コードのみ | deleteMaterialSession |
| papi | POST | `/v3/material/courses/{id}/chapters/{id}/{id}/{id}/session/terminate` | エラー／送信観測 net::ERR_ABORTED | fetch／Beacon呼び出し |

## 授業・コメント

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | GET | `/v1/lessons` | 成功観測 200 | getLessons |
| api | GET | `/v1/lessons/search` | 成功観測 200 | getLessonsSearch |
| api | GET | `/v1/lessons/{id}` | 成功観測 200 | getAdvancedLesson, getLesson（パス生成処理を展開） |
| api | POST | `/v1/lessons/{id}/ask_comments` | コードのみ | postLessonAskComment（パス生成処理を展開） |
| api | POST | `/v1/lessons/{id}/comments` | コードのみ | postComment（パス生成処理を展開） |
| api | GET | `/v1/lessons/{id}/live` | コードのみ | getLessonLive（パス生成処理を展開） |
| api | PUT | `/v1/lessons/{id}/progress/passed` | コードのみ | putProgressPassed（パス生成処理を展開） |
| api | PUT | `/v1/lessons/{id}/progress/start` | コードのみ | putProgressStart（パス生成処理を展開） |
| api | POST | `/v1/lessons/{id}/solution` | コードのみ | postLessonSolution（パス生成処理を展開） |
| api | GET | `/v1/media` | コードのみ | getMedia |
| api | POST | `/v1/media` | コードのみ | postMedia |
| api | GET | `/v1/n_school/courses/{id}/chapters/{id}/lessons/{id}` | コードのみ | getLesson, getNSchoolLesson（パス生成処理を展開） |
| api | POST | `/v1/n_school/courses/{id}/chapters/{id}/lessons/{id}/ask_comments` | コードのみ | postLessonAskComment（パス生成処理を展開） |
| api | POST | `/v1/n_school/courses/{id}/chapters/{id}/lessons/{id}/comments` | コードのみ | postComment（パス生成処理を展開） |
| api | GET | `/v1/n_school/courses/{id}/chapters/{id}/lessons/{id}/live` | コードのみ | getLessonLive（パス生成処理を展開） |
| api | PUT | `/v1/n_school/courses/{id}/chapters/{id}/lessons/{id}/progress/passed` | コードのみ | putProgressPassed（パス生成処理を展開） |
| api | PUT | `/v1/n_school/courses/{id}/chapters/{id}/lessons/{id}/progress/start` | コードのみ | putProgressStart（パス生成処理を展開） |
| api | POST | `/v1/n_school/courses/{id}/chapters/{id}/lessons/{id}/solution` | コードのみ | postLessonSolution（パス生成処理を展開） |
| api | GET | `/v1/tags/lesson_search` | 成功観測 200 | getTagsLessonSearch |
| api | GET | `/v2/material/courses/{id}/chapters/{id}/lessons/{id}/playback` | コードのみ | getLessonPlayback |
| papi | PUT | `/v2/material/courses/{id}/chapters/{id}/lessons/{id}/playback` | コードのみ | putLessonPlayPosition |

## テスト・レポート

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | POST | `/v1/material/courses/{id}/chapters/{id}/essay_tests/{id}/answerings` | コードのみ | answerEssayExercise |
| api | POST | `/v1/material/exercises/{id}/answers` | コードのみ | answerExercise |
| api | POST | `/v1/material/short_test_sessions` | コードのみ | postStartShortTestSession |
| api | GET | `/v1/material/short_test_sessions/{id}` | コードのみ | getShortTestSession |
| api | POST | `/v1/material/short_test_sessions/{id}/answering` | コードのみ | postShortTestSessionAnswer |
| api | GET | `/v1/material/short_test_sessions/{id}/result` | コードのみ | getShortTestSessionAnswer |
| api | GET | `/v1/material/short_tests/{id}` | 成功観測 200 | getShortTest |
| api | POST | `/v1/n_school/courses/{id}/chapters/{id}/essay_reports/{id}/answerings` | コードのみ | answerNSchoolEssayMaterial（パス生成処理を展開） |
| api | POST | `/v1/n_school/courses/{id}/chapters/{id}/essay_tests/{id}/answerings` | コードのみ | answerNSchoolEssayMaterial（パス生成処理を展開） |
| api | POST | `/v1/n_school/courses/{id}/chapters/{id}/evaluation_reports/{id}/answerings` | コードのみ | answerEvaluationReport |
| api | POST | `/v1/n_school/courses/{id}/chapters/{id}/evaluation_tests/{id}/answerings` | コードのみ | answerEvaluationTest |
| api | GET | `/v1/n_school/periodic_exam_sessions/{id}/result` | コードのみ | getNSchoolPeriodicExamsId |
| api | GET | `/v2/n_school/periodic_exams` | 成功観測 200 | getNSchoolPeriodicExams |
| api | GET | `/v3/schools/courses/{id}/assessment_test_sessions/{id}` | コードのみ | getAssessmentTestSession |
| api | POST | `/v3/schools/courses/{id}/assessment_test_sessions/{id}/answering` | コードのみ | postAssessmentTestSessionAnswers |
| api | GET | `/v3/schools/courses/{id}/assessment_tests/{id}` | コードのみ | getAssessmentTest |
| api | POST | `/v3/schools/courses/{id}/assessment_tests/{id}/sessions` | コードのみ | postStartAssessmentTestSession |

## フォーラム・通報

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | GET | `/v1/questions` | 成功観測 200 | getQuestions |
| api | POST | `/v1/questions` | コードのみ | postQuestions |
| api | GET | `/v1/questions/activity` | エラー／送信観測 404 | getQuestionsActivity |
| api | GET | `/v1/questions/search` | エラー／送信観測 404 | getQuestionsSearch |
| api | DELETE | `/v1/questions/{id}` | コードのみ | deleteQuestions |
| api | GET | `/v1/questions/{id}` | コードのみ | getQuestion |
| api | GET | `/v1/questions/{id}/answers` | コードのみ | getQuestionAnswers |
| api | POST | `/v1/questions/{id}/answers` | コードのみ | postQuestionAnswers |
| api | GET | `/v1/questions/{id}/balloons/{id}` | コードのみ | getQuestionBalloon |
| api | PATCH | `/v1/questions/{id}/resolution` | コードのみ | patchQuestionsResolution |
| api | POST | `/v1/reports/infringement` | コードのみ | postReportsInfringement |
| api | GET | `/v1/reports/reasons` | コードのみ | getReportsReasons |
| api | POST | `/v1/reports/violation` | コードのみ | postReportsViolation |
| api | GET | `/v1/tags/question` | エラー／送信観測 404 | getTagsQuestion |
| api | GET | `/v3/forum/channels/{id}/threads` | 成功観測 200 | getForumChannelThreads |
| api | GET | `/v3/forum/material_relations/courses/{id}/chapters/{id}/{id}/{id}/threads` | コードのみ | getForumMaterialRelationThreads |
| api | GET | `/v3/forum/material_relations/courses/{id}/chapters/{id}/{id}/{id}/threads/count` | 成功観測 200 | getForumMaterialRelationsThreadsCount |
| api | GET | `/v3/forum/material_relations/lessons/{id}/threads` | コードのみ | getForumMaterialRelationsLessonsThreads |
| api | GET | `/v3/forum/menu` | 成功観測 200 | getForumMenu |
| api | GET | `/v3/forum/my_threads` | 成功観測 200 | getForumMyThreads |
| api | POST | `/v3/forum/reports/infringement` | コードのみ | postForumReportsInfringement |
| api | GET | `/v3/forum/reports/reasons` | コードのみ | getForumReportsReasons |
| api | POST | `/v3/forum/reports/violation` | コードのみ | postForumReportsViolation |
| api | GET | `/v3/forum/thread_params` | 成功観測 200 | getForumThreadParams |
| api | POST | `/v3/forum/threads` | コードのみ | postForumThreads |
| api | DELETE | `/v3/forum/threads/{id}` | コードのみ | deleteForumThread |
| api | GET | `/v3/forum/threads/{id}` | 成功観測 200 | getForumThread |
| api | POST | `/v3/forum/threads/{id}/replies` | コードのみ | postForumThreadsIdReplies |
| api | PATCH | `/v3/forum/threads/{id}/resolved` | コードのみ | patchForumThreadsResolved |

## 通知・アナウンス

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | GET | `/v1/notices` | 成功観測 200 | getNotices |
| api | GET | `/v1/notices/unreads` | 成功観測 200, 401 | getUnreadNotices |
| api | PUT | `/v1/notices/{id}/mark` | 成功観測 204 | putNoticeMark, putNoticesIdMark |
| api | GET | `/v2/announcements` | 成功観測 200 | getAnnouncements |
| api | GET | `/v3/notices/importants` | 成功観測 200 | getNoticesImportants |

## イベント

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | GET | `/v1/official_events/unreads` | 成功観測 200 | getUnreadOfficialEvents |
| api | PUT | `/v1/official_events/{id}/read` | コードのみ | putOfficialEvent |

## 商品・決済

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | GET | `/v1/products` | 成功観測 200 | getProducts |
| api | GET | `/v1/products/payments` | エラー／送信観測 403 | getPayments |

## 顔認証

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | POST | `/v3/recognition/faces/session` | コードのみ | postV3RecognitionFacesSession |

## 問い合わせ

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | GET | `/v1/contact_types` | 成功観測 200 | getContactTyeps |
| api | POST | `/v1/contacts` | コードのみ | postContacts |

## debug定義（未実行）

| ホスト | メソッド | パス | 確認状況 | クライアント定義／注記 |
| --- | --- | --- | --- | --- |
| api | GET | `/v3/debug/school_term_learnings` | コードのみ | getDebugSchoolTermLearnings |
| api | POST | `/v3/debug/school_term_learnings` | コードのみ | postDebugSchoolTermLearnings |
| api | PUT | `/v3/debug/school_term_learnings` | コードのみ | putDebugSchoolTermLearnings |

## 定義ごとのクエリ・本文を確認する

`inventory.json` の各ルートには `definitions[]` がある。`template` は元のパス式を引数名付きで表し、`queryTemplate` はURL内のクエリ、`parameters` は関数の引数、`requestExpression` はパスに続く引数である。GETではクエリ指定、POST等では本文指定、生成クライアントではoptionsの場合がある。

これらは圧縮された配信コードの構文であり、型定義や必須条件ではない。`requestExpression: "e"` のような転送引数から本文形式を推測しない。`source`・`offsetUtf16` とソースのSHA-256で元の位置を確認できる。実測レスポンスの型は各 `*observations.json` にある。

debug定義はブラウザ配信物内に存在したものを記録しただけで、実行していない。決済・顔認証・削除・投稿・提出も、コードだけの行を成功する仕様として扱わない。
