ALTER TABLE "registered_repositories" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "registered_repositories" ALTER COLUMN "user_id" DROP NOT NULL;