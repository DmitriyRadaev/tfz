CREATE TYPE "public"."account_role" AS ENUM('SUPERADMIN', 'ADMIN', 'WORKER');--> statement-breakpoint
CREATE TYPE "public"."calculation_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."calculation_mode" AS ENUM('dtz', 'mtz');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"surname" text NOT NULL,
	"patronymic" text DEFAULT '' NOT NULL,
	"role" "account_role" DEFAULT 'WORKER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_staff" boolean DEFAULT false NOT NULL,
	"is_superuser" boolean DEFAULT false NOT NULL,
	"session_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculation_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"doctor_id" bigint,
	"patient_id" bigint NOT NULL,
	"mode" "calculation_mode" NOT NULL,
	"age" integer NOT NULL,
	"gender" "calculation_gender" NOT NULL,
	"st4" double precision NOT NULL,
	"ttg" double precision NOT NULL,
	"atrttg" double precision NOT NULL,
	"thyroid_volume" double precision NOT NULL,
	"eop_stage" integer NOT NULL,
	"thyrostatic_daily_dose_mg" double precision NOT NULL,
	"thyrostatic_therapy_duration_months" double precision NOT NULL,
	"ccc_complications" boolean DEFAULT false NOT NULL,
	"compression_syndrome" boolean DEFAULT false NOT NULL,
	"slco1b1_polymorphism" boolean DEFAULT false NOT NULL,
	"score" integer NOT NULL,
	"severity" text NOT NULL,
	"recommendation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"surname" text NOT NULL,
	"patronymic" text DEFAULT '' NOT NULL,
	"birth_date" date NOT NULL,
	"gender" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patients_gender_check" CHECK ("patients"."gender" in (0, 1))
);
--> statement-breakpoint
CREATE TABLE "worker_profiles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"work" text DEFAULT '' NOT NULL,
	"position" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calculation_history" ADD CONSTRAINT "calculation_history_doctor_id_accounts_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calculation_history" ADD CONSTRAINT "calculation_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_profiles" ADD CONSTRAINT "worker_profiles_user_id_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_unique" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "accounts_created_at_idx" ON "accounts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "calculation_history_patient_created_idx" ON "calculation_history" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "calculation_history_doctor_idx" ON "calculation_history" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "patients_created_at_idx" ON "patients" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "worker_profiles_user_id_unique" ON "worker_profiles" USING btree ("user_id");