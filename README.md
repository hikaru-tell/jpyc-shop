# JPYC 決済 MVP 開発メモ

## 技術スタック

- 言語/フレームワーク: **TypeScript**
  - API: **Hono** or Express
  - ダッシュボード: **Next.js (App Router)**
- DB: **PostgreSQL** + **Prisma**
- チェーン: **Polygon**（ガス安、JPYC 流通あり）
- チェーンライブラリ: **viem**
- キュー: **BullMQ + Redis**（Webhook 再送/確定ブロック待ち用）
- その他: zod（バリデーション）、pino（ログ）

---

## ディレクトリ構成（MVP）

/api ← Hono/Express: payments API, Webhook, Worker
/widget ← 1 ファイル出力（embed 用 JS）
/dashboard ← Next.js: 店舗設定・履歴 UI
/prisma ← schema.prisma & migrations

---

## DB スキーマ（Prisma 例）

```prisma
model Merchant {
  id           String  @id @default(cuid())
  name         String
  apiKeyHash   String
  jpycAddress  String
  webhookUrl   String?
  createdAt    DateTime @default(now())
  payments     Payment[]
}

model Payment {
  id           String   @id @default(cuid())
  merchant     Merchant @relation(fields: [merchantId], references: [id])
  merchantId   String
  orderId      String
  amountJpy    Int
  amountJpyc   Decimal @db.Numeric(78,0)
  status       String   // pending/paid/expired
  txHash       String?  @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  @@index([merchantId, orderId])
}
```

API 最小 IF
• POST /payments
入力: {merchantApiKey, orderId, amountJpy}
出力: {paymentId, amountJpyc, token:"JPYC", toAddress, expiresAt}
• GET /payments/:id
出力: {status, txHash}
• Webhook (POST)
店舗側に送信: {paymentId, orderId, status:"paid", txHash, amountJpyc}

---

Widget
• EC に以下を 1 行埋め込み

<script src=".../widget.js" data-order-id="123" data-amount-jpy="2980"></script>

    •	起動時:
    1.	/payments 呼び出し
    2.	QR生成 or MetaMask/WalletConnect送金ボタン表示
    3.	数秒ポーリングで/payments/:id確認
    4.	完了表示

⸻

Worker（チェーン監視）
• Alchemy/QuickNode RPC で JPYC の Transfer イベント購読
• 条件:
to == merchant.jpycAddress
value ≈ payments.amount_jpyc
• Polygon は 6〜20 ブロック確定待ち
• マッチしたら → paid 更新 → Webhook 送信（冪等処理）

⸻

エラー/例外ハンドリング
• 期限切れ: expiresAt 過ぎたら expired
• 不足額: NG 表示
• 過多額: 受領 OK（差額返金は手動）
• 二重決済: 同 orderId は最新 pending だけ有効

⸻

セキュリティ最小
• API キーはハッシュ保存
• Webhook 署名: X-Signature + timestamp (HMAC)
• Worker 冪等: txHash ユニーク制約 & 状態遷移チェック

⸻

初手スプリント（MVP の流れ） 1. Prisma & DB セットアップ 2. POST /payments & GET /payments 実装（固定レート） 3. Widget: QR 表示 & MetaMask 送金ボタン 4. Worker: Transfer 購読 → paid 更新 → ダミー Webhook 送信 5. ダッシュボード: 受取アドレス登録・履歴一覧
