CREATE TABLE "session" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"youtube_clicked" boolean DEFAULT false,
	"twitter_clicked" boolean DEFAULT false,
	"discord_clicked" boolean DEFAULT false,
	"telegram_clicked" boolean DEFAULT false,
	"all_clicked" boolean DEFAULT false,
	"reward_sent" boolean DEFAULT false,
	"transaction_hash" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"verified_at" timestamp with time zone,
	CONSTRAINT "social_verifications_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "onramp_transactions" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "social_verifications" ADD CONSTRAINT "social_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;