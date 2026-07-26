# iPhone写真撮影・Google Drive整理アプリ 仕様書

- 文書バージョン: 0.2
- 作成日: 2026-07-26
- 対象端末: iPhone
- 開発環境: Windows PC / VS Code / Codex
- 推奨技術: React Native + Expo + TypeScript
- 仮称: Lab Drive Camera

---

## 1. 目的

iPhoneのアプリ内カメラで写真を撮影し、撮影時にGoogle Drive上の保存先フォルダを選択して保存できるアプリを開発する。

主な用途は、研究室、試験、実験、組立、輸送、現場作業などで撮影した写真の整理である。

通常のiPhoneカメラとGoogle Driveアプリを行き来せず、以下の操作を1つのアプリ内で完結させる。

1. Googleアカウントへログイン
2. Google Drive上のフォルダ一覧を取得
3. 保存先フォルダを選択
4. 必要ならアプリ内からフォルダを新規作成
5. 写真を撮影
6. ファイル名を確認・必要なら変更
7. iPhone内へ一時保存
8. 任意のタイミングでGoogle Driveへアップロード

---

## 2. 想定する運用

### 2.1 試験前

Google Drive上に必要と思われるフォルダを作成しておく。

例:

```text
実験写真/
  2026_RW04_振動試験/
  2026_RW04_RW単体測定/
  2026_STM_モーダル試験/
  TKSC_搬入・設置/
```

すべての撮影内容を事前に予測する必要はない。

### 2.2 試験中

ユーザーはアプリを開き、Drive上の保存先をその場で選択する。

必要なフォルダが存在しない場合は、アプリ内から新規作成する。

例:

```text
2026_RW04_振動試験/
  試験前/
  センサ設置/
  配線/
  加振1回目/
  加振2回目/
  試験後/
```

このサブフォルダは、現場の状況に応じて追加できる。

### 2.3 試験後

未同期写真を確認し、まとめてGoogle Driveへアップロードする。

アップロード前であれば、保存先フォルダとファイル名を変更できる。

---

## 3. 設計方針

### 3.1 Google Driveをフォルダ構成の正本とする

アプリ独自の固定フォルダ一覧を持たず、Google Drive APIから実際のフォルダ一覧を取得する。

Drive側で作成、変更されたフォルダをアプリへ反映する。

### 3.2 保存先はフォルダ名ではなくDriveフォルダIDで管理する

Google Driveでは同じ名前のフォルダを複数作成できる。

したがって、表示にはフォルダ名を使うが、内部では一意な `driveFolderId` を使用する。

```text
表示名: 加振1回目
DriveフォルダID: 1AbCdEfGh...
```

写真アップロード時は、選択したフォルダIDを親フォルダとして指定する。

### 3.3 オフラインファースト

撮影した写真は、Google Driveへ直接送る前に必ずiPhoneのアプリ専用領域へ保存する。

通信が不安定でも、写真を失わないことを優先する。

### 3.4 撮影内容は事前固定しない

何を撮影するか、どの分類が必要になるかは試験中に変化するため、写真カテゴリを必須の事前設定にしない。

必要に応じて、その場でフォルダを作成し、保存先を切り替える。

### 3.5 撮影者名をファイル名へ含める

複数人が同じフォルダへ撮影してもファイル名が衝突しにくいよう、撮影者コードを自動で含める。

例:

```text
加振1回目_20260726_143512_KUBOTA.jpg
```

さらに内部では写真UUIDを持たせ、同時刻・同じ撮影者でも確実に識別する。

---

## 4. 推奨技術構成

### 4.1 アプリ

- React Native
- Expo
- TypeScript
- Expo Router

### 4.2 主なライブラリ

- `expo-camera`
  - アプリ内カメラ
- `expo-file-system`
  - ローカル写真保存
- `expo-sqlite`
  - 写真、フォルダキャッシュ、アップロードキュー
- `expo-secure-store`
  - 認証関連情報の安全な保存
- `@react-native-google-signin/google-signin`
  - Googleログイン
- `@react-native-community/netinfo`
  - ネットワーク状態確認
- `zustand`
  - UI状態管理
- `zod`
  - API応答、設定値の検証
- Google Drive API v3
  - フォルダ一覧取得
  - フォルダ作成
  - 写真アップロード
  - 重複確認

### 4.3 ビルド

- 通常のコード編集: Windows PC + VS Code + Codex
- iOS実機用ビルド: EAS Build
- iPhoneへの配布:
  - Development Build
  - Internal Distribution
  - 将来的にはTestFlight

---

## 5. 初期設定

### 5.1 Googleログイン

ユーザーは東京大学のECCSクラウドメールでログインする。

想定形式:

```text
xxxx@g.ecc.u-tokyo.ac.jp
```

初期版では、許可ドメインを次に限定できる設定を用意する。

```text
g.ecc.u-tokyo.ac.jp
```

ただし、開発用Googleアカウントを許可するデバッグ設定も用意する。

### 5.2 撮影者情報

初回ログイン時に以下を設定する。

- 表示名
- 撮影者コード
- メールアドレス

例:

```text
表示名: 窪田 航己
撮影者コード: KUBOTA
メール: xxxx@g.ecc.u-tokyo.ac.jp
```

撮影者コードはファイル名へ使用する。

許可文字:

```text
A-Z
0-9
-
_
```

推奨形式:

```text
KUBOTA
UCHIDA
NAKAMURA
```

### 5.3 Drive起点フォルダ

アプリがGoogle Drive全体を毎回表示すると選択が大変なため、最初に「起点フォルダ」を選択できるようにする。

例:

```text
研究室共有ドライブ/
  実験写真/
```

以後、アプリは原則として、この起点フォルダ以下だけを表示する。

ユーザーは設定画面から起点フォルダを変更できる。

---

## 6. 画面構成

## 6.1 ホーム画面

表示項目:

- 現在のGoogleアカウント
- 現在の撮影者名
- 現在選択中の保存先フォルダ
- 未同期写真数
- 最終同期時刻

主要ボタン:

- 保存先を選ぶ
- 写真を撮る
- 未同期写真を見る
- 同期する
- 設定

## 6.2 Driveフォルダ選択画面

Google Drive APIからフォルダ一覧を取得する。

表示形式:

```text
実験写真
  > 2026_RW04_振動試験
  > 2026_STM_モーダル試験
  > TKSC_搬入・設置
```

機能:

- 子フォルダへ移動
- 親フォルダへ戻る
- 現在のフォルダを保存先に設定
- フォルダ名検索
- お気に入り表示
- 最近使用したフォルダ表示
- 一覧の再読み込み
- 新しいフォルダを作成

フォルダごとに表示する情報:

- フォルダ名
- 親フォルダ名
- 更新日時
- DriveフォルダIDの末尾
- 共有ドライブかマイドライブか

同名フォルダを区別できるよう、パンくずリストを表示する。

例:

```text
研究室共有ドライブ
  / 実験写真
  / 2026_RW04_振動試験
  / 加振1回目
```

## 6.3 フォルダ新規作成画面

入力項目:

- 新しいフォルダ名
- 作成先フォルダ
- 作成後に保存先として選択するか

例:

```text
新しいフォルダ名:
加振2回目

作成先:
実験写真 / 2026_RW04_振動試験

[作成して選択]
```

作成後:

1. Drive APIでフォルダを作成
2. 作成されたDriveフォルダIDを取得
3. フォルダキャッシュを更新
4. 新規フォルダを現在の保存先に設定
5. カメラ画面へ戻る

同名フォルダが既に存在する場合は警告を表示する。

```text
同じ場所に「加振2回目」というフォルダが既にあります。

[既存フォルダを使用]
[別名で作成]
[キャンセル]
```

同名作成を完全には禁止しないが、意図しない重複を防ぐ。

## 6.4 カメラ画面

表示項目:

- 現在の保存先フォルダ
- 撮影者コード
- 未同期写真数

機能:

- 背面カメラ
- フラッシュ切替
- 撮影
- 撮り直し
- 保存先変更
- 連続撮影モード

現在の保存先を目立つ位置に表示する。

例:

```text
保存先:
2026_RW04_振動試験 / 加振1回目
```

誤ったフォルダへ保存しないため、カメラ画面から1タップで保存先を変更できるようにする。

## 6.5 撮影後確認画面

表示項目:

- 写真プレビュー
- 保存先フォルダ
- 自動生成されたファイル名
- 撮影者
- 撮影日時
- 任意メモ

操作:

- この名前で保存
- ファイル名を変更
- 保存先を変更
- 撮り直す
- 削除

## 6.6 ローカル写真一覧

絞り込み:

- すべて
- 未同期
- 同期済み
- エラー
- フォルダ別
- 撮影日別
- 撮影者別

表示項目:

- サムネイル
- ファイル名
- 保存先
- 撮影日時
- 同期状態

## 6.7 同期画面

表示項目:

- 未同期件数
- アップロード中件数
- 成功件数
- 失敗件数
- 合計容量
- 通信状態
- Google認証状態

操作:

- すべてアップロード
- 選択した写真をアップロード
- 失敗分のみ再試行
- アップロードを一時停止
- 保存先不明写真を修正

---

## 7. Google Driveフォルダ取得仕様

### 7.1 一覧取得

Drive APIの `files.list` を使用する。

フォルダだけを取得する検索条件の概念:

```text
mimeType = application/vnd.google-apps.folder
trashed = false
親フォルダID = 現在表示中のフォルダID
```

取得フィールド:

- id
- name
- mimeType
- parents
- modifiedTime
- driveId
- capabilities.canAddChildren
- capabilities.canEdit

### 7.2 共有ドライブ対応

研究室の共有ドライブを使用する可能性があるため、共有ドライブ対応を設計に含める。

考慮項目:

- マイドライブ
- 共有ドライブ
- 共有されたフォルダ
- `supportsAllDrives`
- `includeItemsFromAllDrives`
- `corpora`
- `driveId`

MVPで共有ドライブ対応が難しい場合も、データモデルには `driveId` を保持する。

### 7.3 キャッシュ

Driveフォルダ一覧はSQLiteへキャッシュする。

目的:

- 画面表示の高速化
- 通信不安定時に最近使用したフォルダを表示
- 選択済みフォルダIDの保持

ただし、キャッシュだけを信頼せず、アップロード前にはフォルダ存在と書き込み権限を再確認する。

### 7.4 最近使ったフォルダ

ユーザーごとに、最近使用した保存先を最大10件保持する。

例:

```text
最近使用
1. 加振1回目
2. センサ設置
3. 試験前
4. 搬入時外観
```

フォルダ選択の手間を減らす。

### 7.5 お気に入り

よく使うフォルダをお気に入り登録できる。

お気に入り情報はアプリ内に保存し、Google Drive側には影響させない。

---

## 8. Google Driveフォルダ作成仕様

Drive APIの `files.create` を使用する。

フォルダ作成時のメタデータ:

```json
{
  "name": "加振2回目",
  "mimeType": "application/vnd.google-apps.folder",
  "parents": ["PARENT_FOLDER_ID"]
}
```

要件:

- 作成先への追加権限を確認
- 空文字禁止
- 前後空白除去
- `/` など紛らわしい文字を警告
- 同名フォルダの存在確認
- 作成結果のフォルダIDを保存
- 作成後に一覧へ即時反映
- 通信失敗時はローカルだけに仮フォルダを作らない

オフライン中の新規Driveフォルダ作成はMVPでは不可とする。

---

## 9. ファイル命名仕様

### 9.1 デフォルト名

デフォルト形式:

```text
{folderName}_{yyyyMMdd}_{HHmmss}_{photographerCode}.jpg
```

例:

```text
加振1回目_20260726_143512_KUBOTA.jpg
```

フォルダ名が長い場合:

```text
{shortenedFolderName}_{yyyyMMdd}_{HHmmss}_{photographerCode}.jpg
```

### 9.2 衝突防止

撮影者名と秒単位時刻だけでも通常は重複しにくいが、連続撮影では衝突する可能性がある。

内部では必ず写真UUIDを持つ。

同じファイル名がDrive上またはローカル上に存在する場合は、末尾に連番または短いUUIDを追加する。

例:

```text
加振1回目_20260726_143512_KUBOTA_02.jpg
```

または:

```text
加振1回目_20260726_143512_KUBOTA_A1B2.jpg
```

推奨は連番である。

### 9.3 撮影者コード

撮影者コードはログイン後に設定し、毎回入力しない。

例:

```text
KUBOTA
UCHIDA
NAKAMURA
```

撮影後確認画面では表示するが、通常は編集しない。

### 9.4 ファイル名編集

撮影後、アップロード前であればファイル名を自由に変更できる。

ただし、次を自動補正する。

- `/ \ : * ? " < > |` を `_` に置換
- 前後空白を除去
- 連続空白を `_` に変換
- 連続 `_` を1個にまとめる
- 拡張子を保持
- 最大120文字程度へ制限

ユーザーがファイル名を変更しても、内部UUID、撮影者、撮影日時はメタデータとして保持する。

### 9.5 任意の説明追加

デフォルト名に任意の説明を追加できる。

例:

```text
加振1回目_20260726_143512_KUBOTA_加速度計CH3貼付位置.jpg
```

入力欄:

```text
説明を追加: 加速度計CH3貼付位置
```

説明入力は必須にしない。

---

## 10. 時間帯による整理

フォルダ選択を基本とするため、時間帯による自動分類は補助機能とする。

機能:

- 撮影時刻を自動記録
- 写真一覧を時間帯でグループ表示
- 15分以上撮影が空いた場合に表示上の区切りを入れる
- Drive上のフォルダを自動作成しない
- ユーザーが必要と判断した場合だけ、その時間帯の写真用フォルダを作成する

例:

```text
09:10–09:35  14枚
10:02–10:48  26枚
11:15–12:30  43枚
```

ユーザーは後から、選択した時間帯の写真を新規Driveフォルダへまとめて移動できる。

これはMVP後の追加機能とする。

---

## 11. ローカル保存

アプリ専用Document Directoryへ保存する。

```text
documents/
  photos/
    {photoId}.jpg
  thumbnails/
    {photoId}.jpg
  logs/
```

ローカル実ファイル名にはUUIDを使う。

```text
7d483dd7-e00d-4e80-b580-abe5d956f25f.jpg
```

ユーザー向けファイル名はSQLiteに保存し、Driveアップロード時に使用する。

理由:

- ファイル名変更時に実ファイルを何度も移動しなくてよい
- 同名衝突を防げる
- アップロード状態を安定して管理できる

---

## 12. データベース設計

SQLiteを使用する。

### 12.1 users

```text
id TEXT PRIMARY KEY
email TEXT NOT NULL
display_name TEXT NOT NULL
photographer_code TEXT NOT NULL
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

### 12.2 drive_folders

```text
id TEXT PRIMARY KEY
drive_id TEXT
name TEXT NOT NULL
parent_id TEXT
full_path_cache TEXT
can_add_children INTEGER NOT NULL
can_edit INTEGER NOT NULL
is_favorite INTEGER NOT NULL
last_used_at TEXT
modified_time TEXT
cached_at TEXT NOT NULL
```

### 12.3 photos

```text
id TEXT PRIMARY KEY
local_uri TEXT NOT NULL
thumbnail_uri TEXT
target_folder_id TEXT NOT NULL
target_folder_name_cache TEXT NOT NULL
drive_id TEXT
photographer_code TEXT NOT NULL
captured_at TEXT NOT NULL
default_file_name TEXT NOT NULL
current_file_name TEXT NOT NULL
memo TEXT
mime_type TEXT NOT NULL
file_size INTEGER
sha256 TEXT
upload_status TEXT NOT NULL
drive_file_id TEXT
uploaded_at TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

`upload_status`:

- `local`
- `queued`
- `uploading`
- `uploaded`
- `failed`
- `target_missing`
- `deleted`

### 12.4 upload_jobs

```text
id TEXT PRIMARY KEY
photo_id TEXT NOT NULL
status TEXT NOT NULL
attempt_count INTEGER NOT NULL
last_error_code TEXT
last_error_message TEXT
next_retry_at TEXT
created_at TEXT NOT NULL
updated_at TEXT NOT NULL
```

---

## 13. 写真アップロード

### 13.1 送信メタデータ

```json
{
  "name": "加振1回目_20260726_143512_KUBOTA.jpg",
  "parents": ["TARGET_FOLDER_ID"],
  "appProperties": {
    "appPhotoId": "PHOTO_UUID",
    "photographerCode": "KUBOTA",
    "capturedAt": "2026-07-26T14:35:12+09:00"
  }
}
```

### 13.2 重複防止

ファイル名だけではなく `appPhotoId` で重複確認する。

アップロード前にDrive上で同じ `appPhotoId` を持つファイルを検索する。

見つかった場合:

- 再アップロードしない
- DriveファイルIDをローカルへ保存
- 状態を `uploaded` へ変更

### 13.3 保存先確認

アップロード前に以下を確認する。

- フォルダが存在する
- ゴミ箱に入っていない
- 書き込み可能
- 必要な共有ドライブへアクセス可能

フォルダが削除または権限変更されている場合:

```text
保存先フォルダへアクセスできません。

[別のフォルダを選ぶ]
[後で再試行]
```

ローカル写真は削除しない。

### 13.4 再試行

自動再試行対象:

- ネットワークエラー
- HTTP 429
- HTTP 500
- HTTP 502
- HTTP 503
- HTTP 504

認証切れ、権限不足、フォルダ不存在はユーザー操作を要求する。

---

## 14. Google OAuth権限

基本スコープ:

```text
openid
email
profile
https://www.googleapis.com/auth/drive.file
```

ただし、このアプリでは「Driveに既に存在する任意のフォルダ一覧を取得し、選択し、子フォルダを作成する」という要件がある。

`drive.file` だけでは、アプリから明示的に選択・許可されていない既存フォルダを自由に一覧表示できない場合がある。

本番設計では、次のどちらかを選択する。

### 方針A: Google Pickerとdrive.file

- Google Pickerで起点フォルダをユーザーに選ばせる
- 選ばれた起点フォルダ以下をアプリで扱う
- アクセス範囲を限定しやすい
- プライバシー上望ましい
- Picker用Web画面またはWebView実装が必要

### 方針B: 広いDriveスコープ

- Drive内のフォルダ一覧を直接取得できる
- 実装は比較的単純
- 全Driveへの広いアクセス許可が必要
- GoogleのOAuth審査や組織管理者の制限対象になりやすい

推奨は方針Aである。

東京大学Google Workspaceの管理設定によっては、自作OAuthアプリの利用許可が必要になる可能性がある。

---

## 15. セキュリティ

- Googleパスワードをアプリへ入力・保存しない
- OAuthクライアントシークレットをアプリへ埋め込まない
- アクセストークンを通常のAsyncStorageへ保存しない
- ログへアクセストークンを出力しない
- ローカル写真はユーザー操作なしに削除しない
- Drive上の削除機能はMVPでは実装しない
- フォルダ新規作成前に作成先を明示する
- 写真アップロード前に保存先を確認可能にする
- ログアウト後も未同期写真を保持する
- 別アカウントで再ログインした場合は保存先アクセスを再確認する

---

## 16. MVP対象

### Phase 1: ローカル撮影

- カメラ撮影
- 撮影者コード設定
- 仮のローカルフォルダ選択
- デフォルトファイル名生成
- ファイル名編集
- ローカル保存
- 写真一覧
- 削除
- SQLite

### Phase 2: Googleログイン

- Google OAuth
- ECCSメール確認
- SecureStore
- Development Build

### Phase 3: Driveフォルダ選択

- 起点フォルダ選択
- 子フォルダ一覧取得
- パンくず表示
- 最近使ったフォルダ
- お気に入り
- 保存先選択

### Phase 4: Driveフォルダ作成

- アプリ内から新規フォルダ作成
- 同名警告
- 作成先確認
- 作成後の自動選択
- 共有ドライブ対応

### Phase 5: 写真アップロード

- 未同期キュー
- 一括アップロード
- 保存先確認
- appProperties
- 重複防止
- 再試行

### Phase 6: 運用改善

- 時間帯表示
- 複数選択移動
- フォルダ検索
- QRコードで起点フォルダ共有
- TestFlight配布

---

## 17. 受け入れ条件

1. iPhone実機でアプリ内撮影できる
2. 撮影者コードがファイル名へ自動挿入される
3. Driveの起点フォルダを選べる
4. 起点フォルダ以下のフォルダ一覧を取得できる
5. アプリ内UIで保存先を切り替えられる
6. アプリ内からDriveフォルダを新規作成できる
7. 作成したフォルダをそのまま保存先に選べる
8. ファイル名がデフォルトで自動生成される
9. アップロード前にファイル名を変更できる
10. 通信なしでも写真をローカル保存できる
11. 後からまとめてアップロードできる
12. 複数人が同じフォルダへ撮影しても名前が衝突しにくい
13. 同じ写真が二重アップロードされない
14. フォルダが削除されてもローカル写真を失わない
15. Google Driveアプリとカメラアプリを行き来せず操作できる

---

## 18. 推奨ディレクトリ構成

```text
lab-drive-camera/
  app/
    _layout.tsx
    index.tsx
    login.tsx
    camera.tsx
    photo-review.tsx
    photos.tsx
    sync.tsx
    drive/
      index.tsx
      folder-picker.tsx
      create-folder.tsx
    settings/
      index.tsx
      account.tsx
      photographer.tsx

  src/
    components/
    domain/
      auth/
      driveFolder/
      photo/
      upload/
    services/
      camera/
      filesystem/
      database/
      googleAuth/
      googleDrive/
      naming/
      logging/
    repositories/
    hooks/
    store/
    schemas/
    utils/
    constants/
    types/

  docs/
    SPEC.md
    GOOGLE_CLOUD_SETUP.md
    TEST_PLAN.md

  app.config.ts
  eas.json
  package.json
  tsconfig.json
  .env.example
  README.md
```

---

## 19. Codexへの初回指示

```text
docs/SPEC.mdを読み、この仕様に従ってiPhone向け写真撮影・Google Drive整理アプリを実装してください。

技術構成:
- React Native
- Expo
- TypeScript
- Expo Router
- expo-camera
- expo-file-system
- expo-sqlite

開発環境:
- Windows上のVS Code
- Codex
- iOSビルドはEAS Build

最初はPhase 1のみを実装してください。
Google認証とGoogle Drive APIにはまだ着手しないでください。

Phase 1の実装対象:
1. Expoプロジェクト初期構成
2. 撮影者コードの初期設定と変更
3. カメラ権限要求
4. expo-cameraによる撮影
5. 撮影後プレビュー
6. 仮の保存先フォルダ名を選ぶUI
7. 次の形式によるデフォルトファイル名生成
   {folderName}_{yyyyMMdd}_{HHmmss}_{photographerCode}.jpg
8. デフォルトファイル名の編集
9. アプリDocument Directoryへのローカル保存
10. expo-sqliteへの写真メタデータ保存
11. 写真一覧
12. 写真詳細
13. 未同期写真の編集と削除
14. 命名関数の単体テスト

実装ルール:
- TypeScript strict
- any禁止
- UI、ドメイン、サービス、リポジトリを分離
- 命名処理は純粋関数
- ローカル実ファイル名にはUUIDを使う
- ユーザー向けファイル名はSQLiteで管理
- 写真ライブラリには保存しない
- Google関連のダミーAPIは実装しない
- 例外を握りつぶさない
- READMEに起動方法、テスト方法、未実装項目を記載

まずリポジトリを確認し、実装計画を提示してから変更してください。
```

---

## 20. PC上での開発・確認方針

### Windows PCで可能なこと

- VS Codeでのコード編集
- Codexによる実装支援
- TypeScript型チェック
- ESLint
- 単体テスト
- Web版での画面レイアウト確認
- Android Emulatorでの画面・状態管理確認
- EAS BuildによるiOSアプリのクラウドビルド
- 実物のiPhoneでDevelopment Buildを実行

### Windows PCだけではできないこと

Apple公式のiOS SimulatorはXcodeに含まれ、macOS上でのみ動作する。

そのため、Windows上へApple公式iOS Simulatorを直接インストールすることはできない。

EAS BuildでiOS Simulator用 `.app` を作成することは可能だが、それを実行するiOS SimulatorにはMacが必要である。

### 推奨する確認方法

1. Windows上で実装
2. TypeScript・単体テストをPCで実行
3. WebまたはAndroid Emulatorで一般UIを確認
4. EAS BuildでiPhone用Development Buildを作成
5. 実物のiPhoneへインストール
6. カメラ、ファイル保存、Googleログイン、Drive連携を実機確認

このアプリではカメラ、ファイルシステム、Google認証を使うため、最終的には実物のiPhoneでの確認が必須である。

### Macを使える場合

Macが利用できる場合は、XcodeのiOS Simulatorで以下を確認できる。

- 画面遷移
- 各iPhone画面サイズ
- キーボード表示
- 権限ダイアログ周辺
- 一部のファイル保存
- Googleログイン画面

ただし、カメラ撮影、実際の画質、端末ストレージ、通信切断、バックグラウンド動作などは実機確認を優先する。

---

## 21. 最重要要件

1. 保存先フォルダは撮影現場で選択できる
2. Driveに必要なフォルダがなければアプリ内から作成できる
3. 表示にはフォルダ名、内部処理にはDriveフォルダIDを使用する
4. ファイル名へ撮影者コードと撮影日時を自動挿入する
5. ファイル名はアップロード前に変更できる
6. 写真は必ずローカル保存してからDriveへ転送する
7. Google Driveアプリとカメラアプリを行き来しなくてよいUIにする
