CREATE TABLE "onramp_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"wallet_address" text NOT NULL,
	"merchant_recognition_id" text NOT NULL,
	"order_id" text,
	"amount" text,
	"fiat_amount" text,
	"fiat_currency" text DEFAULT 'INR',
	"status" text DEFAULT 'initiated',
	"status_code" text,
	"status_message" text,
	"tx_hash" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "onramp_transactions_merchant_recognition_id_unique" UNIQUE("merchant_recognition_id"),
	CONSTRAINT "onramp_transactions_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "prompt_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"prompt_amount" integer NOT NULL,
	"price_micros" integer NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "prompt_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"transaction_type" text NOT NULL,
	"prompts_changed" integer NOT NULL,
	"balance_after_tx" integer NOT NULL,
	"notes" text,
	"onramp_order_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "prompt_balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "onramp_transactions" ADD CONSTRAINT "onramp_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_transactions" ADD CONSTRAINT "prompt_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;