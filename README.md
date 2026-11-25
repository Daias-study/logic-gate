# Logic Gate Lab — 電気電子回路の論理ゲートシミュレータ

「Computer Engineering for Babies」を参考に、論理ゲート（`WIRE` / `NOT` / `OR` / `AND` / `XOR` / `LATCH`）や自由なデジタル回路の動作を直感的に体験・設計できるWebアプリです。

## 主な機能

- **絵本モード**: 表紙（二重否定）、第1章〜第6章（`WIRE`, `NOT`, `OR`, `AND`, `XOR`, `LATCH`）、裏表紙（玄関・裏口のドアベル応用）を再現。クリック固定 / 物理ボタン押し続け、ステップ確認モード、ライブ真理値表に対応。
- **自由回路ラボ**: ボタン・スイッチ・クロック・各種論理ゲート・LEDを配置して配線でき、真理値表を自動生成。
- **BASE64URL データ引き継ぎ**: 組んだ回路を `?circuit=...` 付きの共有URLやBASE64URLコードとして書き出し・復元可能。
- **回路図PDFダウンロード**: JIS / IEEE Std 91 準拠の記号・真理値表・部品表・表題欄付きのA4横図面PDFを生成・保存可能。

## GitHub Pages で公開する手順

1. このリポジトリを GitHub にプッシュ（または同期）します。
2. GitHub のリポジトリページで **Settings** → **Pages** を開きます。
3. **Build and deployment** の **Source** を **GitHub Actions** に変更します。
4. **Actions** タブで `Deploy to GitHub Pages` ワークフローが完了すると、公開されたURL（`https://<ユーザー名>.github.io/<リポジトリ名>/`）からアプリを直接操作できます。

## ローカルでの起動方法

```bash
npm install
npm run dev
```

ビルド確認:

```bash
npm run build
```
