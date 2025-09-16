# JPYC 決済 MVP タスクリスト（最速版）

## 環境準備

1. 新規ディレクトリ作成 `jpyc-pay`
2. `pnpm init`（npm でも可）
3. TypeScript 設定（`tsconfig.json`）
4. Hono インストール
5. dotenv インストール
6. viem / web3modal / @walletconnect ライブラリ導入
7. JPYC SDK（公式）導入
8. PostgreSQL 起動（Docker で OK）
9. Prisma / @prisma/client インストール
10. .env に `DATABASE_URL`, `RPC_URL`, `WEBHOOK_SECRET` 設定

--done(9/16:19:39)

## DB / Prisma

11. Prisma 初期化 `npx prisma init`
12. Merchant モデル定義（id, apiKey, jpycAddress, webhookUrl）
13. Payment モデル定義（id, orderId, merchantId, amountJpy, amountJpyc, status, txHash）
14. `npx prisma migrate dev --name init`
15. `npx prisma generate`

## API（Hono）

16. `index.ts` 作成
17. PrismaClient import
18. `POST /payments` 実装（orderId, amountJpy 受け取り → DB 保存 → amountJpyc 算出）
19. `GET /payments/:id` 実装（status 返す）
20. API キー認証 middleware 実装
21. Webhook 送信関数実装（fetch + HMAC 署名）
22. 支払完了時に Webhook 呼び出し
23. ローカルで curl で API 確認

## チェーン監視 Worker

24. `worker.ts` 作成
25. viem で Polygon RPC に接続
26. JPYC コントラクト ABI 読み込み
27. Transfer イベント購読
28. `to == merchant.jpycAddress && value == amountJpyc` 判定
29. 該当したら Payment.status = "paid" 更新
30. txHash 保存
31. Webhook 呼び出しテスト
32. Worker 起動確認

## Widget（フロント埋め込み）

33. /widget ディレクトリ作成
34. Vite で UMD 出力設定
35. index.ts に即時実行関数記述
36. `data-order-id` と `data-amount-jpy` を DOM から取得
37. fetch で `POST /payments` 呼び出し
38. 戻り値から toAddress, amountJpyc を受け取り
39. Web3Modal を使ってウォレット接続
40. JPYC SDK + viem で `transfer(to, amount)` 呼び出し
41. qrcode ライブラリで QR 表示も追加
42. setInterval で `GET /payments/:id` ポーリング
43. status が "paid" になったら ✅ 完了表示
44. expiresAt 超過なら ⏰ 期限切れ表示
45. widget.js をビルドして `dist/widget.js` 生成

## ダッシュボード（最小）

46. Next.js プロジェクト作成
47. ログインなしでまず Merchant 一覧/追加ページ作成
48. Merchant 登録フォーム（name, jpycAddress, webhookUrl）
49. 登録した merchant の payments 一覧をテーブル表示
50. TailwindCSS 導入で最低限整える

## 動作確認

51. Merchant を DB に登録
52. 商品ページに `<script src="/widget.js" data-order-id="123" data-amount-jpy="2980" data-merchant="key">`
53. widget が QR / 送金ボタンを表示するか確認
54. 自分のウォレットで少額 JPYC 送金
55. Worker がイベントを検知 → DB 更新
56. Webhook が届くか確認
57. Widget の表示が「✅ 完了」になるか確認
58. ダッシュボードに支払い履歴が出るか確認

## デプロイ（最速）

59. API/Worker を Railway or Fly.io にデプロイ
60. DB を Neon/Supabase に接続
61. widget.js を Vercel/Cloudflare Pages に配信
62. ダッシュボードを Vercel にデプロイ
