# Lab Drive Camera 使い方メモ

## iPhoneで実際に使う方法

本番に近い確認は、Expo Goではなく **Development Build** を推奨します。

理由:

- カメラ、SQLite、SecureStore、Google OAuthを使うため
- iOS用Google OAuthクライアントIDは、アプリのBundle IDと結びつくため
- Expo GoではOAuthまわりの挙動が実配布アプリと異なることがあるため

### 1. 事前準備

- Apple Developer Programに参加しているApple ID
- Expoアカウント
- Google Cloud Consoleで作成したiOS OAuthクライアントID
- Google Drive APIを有効化済みのGoogle Cloudプロジェクト

このアプリのiOS Bundle ID:

```text
jp.issl.labdrivecamera
```

Google Cloud ConsoleのiOS OAuthクライアントにも、このBundle IDを設定してください。

### 2. 環境変数

`.env` に以下が入っていることを確認します。

```text
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=446912929591-m83hrr25l4cabdr9hdenmf1uc45o6niu.apps.googleusercontent.com
```

WebでもGoogleログインを試す場合は、Web用クライアントIDも使います。

```text
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=446912929591-ek4r55oktgs6imckbf1js8ccmjqv2kar.apps.googleusercontent.com
```

### 3. iPhone用Development Buildを作る

```powershell
cd C:\Users\Kouki\Documents\ISSL\camera
npx expo login
npx eas build --profile development --platform ios
```

初回はEASの質問に答えて、iOS用の署名設定を作成します。

ビルドが完了したら、EASの案内に従ってiPhoneへインストールします。

### 4. 開発サーバーを起動する

Development BuildをiPhoneへ入れたあと、PC側で起動します。

```powershell
cd C:\Users\Kouki\Documents\ISSL\camera
npx expo start --dev-client
```

iPhoneとPCを同じWi-Fiに接続し、iPhoneのDevelopment BuildアプリでQRコードを読み取ります。

### 5. iPhoneでの基本操作

1. アプリを開く
2. `設定` で撮影者コードを確認
3. `同期する` または `Driveから選ぶ` でGoogleログイン
4. `設定` → `Driveから選ぶ` で、あらかじめ作成しておいたDrive保存先フォルダを選択
5. `写真を撮る`
6. 撮影後にファイル名を確認して `この名前で保存`
7. `同期する` → `すべてアップロード`

## Webでの簡単な使い方

Web版はPC上でUIや流れを確認するための簡易確認用です。

```powershell
cd C:\Users\Kouki\Documents\ISSL\camera
npx expo start --web --port 8082
```

ブラウザで開きます。

```text
http://localhost:8082
```

WebでGoogleログインする場合、Google Cloud ConsoleのWeb OAuthクライアントに以下を登録してください。

承認済みのJavaScript生成元:

```text
http://localhost:8082
```

承認済みのリダイレクトURI:

```text
http://localhost:8082
```

## スマホにWeb画面を映して簡易的に使う方法

同じWi-Fi上のスマホからPCの開発サーバーへアクセスできます。

### 1. PCのIPアドレスを調べる

PowerShellで実行します。

```powershell
ipconfig
```

`IPv4 アドレス` を確認します。

例:

```text
192.168.1.23
```

### 2. Expo WebをLAN向けに起動

```powershell
cd C:\Users\Kouki\Documents\ISSL\camera
npx expo start --web --host lan --port 8082
```

### 3. スマホのブラウザで開く

例:

```text
http://192.168.1.23:8082
```

この方法は「スマホ画面でWebアプリとして見る」だけです。iPhoneアプリとしての実機確認はDevelopment Buildを使ってください。

## localhostを止めて起動し直す

Expo/Metroプロセスを探します。

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*expo*' -or $_.CommandLine -like '*metro*') } | Select-Object ProcessId,CommandLine
```

表示されたProcessIdを止めます。

```powershell
Stop-Process -Id 12345,67890
```

再起動します。

```powershell
npx expo start --web --port 8082
```

