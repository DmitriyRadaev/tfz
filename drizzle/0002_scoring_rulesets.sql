CREATE TABLE "scoring_rulesets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"config" jsonb NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calculation_history" ADD COLUMN "ruleset_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "scoring_rulesets" ADD CONSTRAINT "scoring_rulesets_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scoring_rulesets_version_unique" ON "scoring_rulesets" USING btree ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "scoring_rulesets_single_active" ON "scoring_rulesets" USING btree ("is_active") WHERE "scoring_rulesets"."is_active";