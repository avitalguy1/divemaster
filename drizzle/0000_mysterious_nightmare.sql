CREATE EXTENSION IF NOT EXISTS "citext";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('ACTIVE', 'COMPLETE', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."evidence_type" AS ENUM('PERFORMANCE', 'VERIFICATION', 'SPECIALTY_CERT', 'ONLINE_COURSE');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'VOIDED');--> statement-breakpoint
CREATE TYPE "public"."scoring_type" AS ENUM('NONE', 'SCORE_1_5', 'SCORE_SHEET', 'EXAM');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('STUDENT', 'INSTRUCTOR', 'ADMIN');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"dive_center_id" uuid NOT NULL,
	"status" "course_status" DEFAULT 'ACTIVE' NOT NULL,
	"started_at" timestamp DEFAULT CURRENT_DATE NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "dive_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"request_id" uuid,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scoring" "scoring_type" DEFAULT 'NONE' NOT NULL,
	"evidence" "evidence_type" DEFAULT 'PERFORMANCE' NOT NULL,
	"required_count" integer DEFAULT 1 NOT NULL,
	"min_score" integer,
	"alternative_note" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "requirement_items_code_unique" UNIQUE("code"),
	CONSTRAINT "required_count_positive" CHECK (required_count >= 1)
);
--> statement-breakpoint
CREATE TABLE "requirement_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer,
	"section_id" integer,
	"rule_type" text NOT NULL,
	"threshold" integer,
	"message" text NOT NULL,
	CONSTRAINT "rule_target" CHECK (num_nonnulls(item_id, section_id) = 1)
);
--> statement-breakpoint
CREATE TABLE "requirement_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "requirement_sections_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "score_sheet_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"line_number" integer NOT NULL,
	"label" text NOT NULL,
	"is_underwater" boolean DEFAULT false NOT NULL,
	"counts_toward_total" boolean DEFAULT true NOT NULL,
	"min_score" integer
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signer_id" uuid NOT NULL,
	"image_data" "bytea",
	"storage_key" text,
	"mime_type" text DEFAULT 'image/png' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signature_has_payload" CHECK (num_nonnulls(image_data, storage_key) = 1)
);
--> statement-breakpoint
CREATE TABLE "signoff_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"status" "request_status" DEFAULT 'PENDING' NOT NULL,
	"performed_at" timestamp with time zone NOT NULL,
	"performed_tz" text DEFAULT 'UTC' NOT NULL,
	"student_note" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"decided_at" timestamp with time zone,
	"instructor_name_snapshot" text,
	"instructor_padi_snapshot" text,
	"instructor_comment" text,
	"rejection_reason" text,
	"signature_id" uuid,
	"score" integer,
	"satisfied_by" "evidence_type",
	"exam_part1_score" numeric(5, 2),
	"exam_part2_score" numeric(5, 2),
	"dive_theory_online" boolean DEFAULT false NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decided_fields_present" CHECK (status <> 'APPROVED' OR (decided_at IS NOT NULL AND instructor_name_snapshot IS NOT NULL AND instructor_padi_snapshot IS NOT NULL)),
	CONSTRAINT "rejection_needs_reason" CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL),
	CONSTRAINT "score_range" CHECK (score IS NULL OR (score BETWEEN 1 AND 5))
);
--> statement-breakpoint
CREATE TABLE "signoff_scores" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"request_id" uuid NOT NULL,
	"line_id" integer NOT NULL,
	"score" integer NOT NULL,
	CONSTRAINT "score_range" CHECK (score BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"birth_date" timestamp,
	"address_line" text,
	"city" text,
	"state_province" text,
	"country" text,
	"postal_code" text,
	"home_phone" text,
	"emergency_contact" text,
	"emergency_phone" text,
	"logged_dives" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "logged_dives_non_negative" CHECK (logged_dives >= 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dive_center_id" uuid NOT NULL,
	"email" "citext",
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"middle_initial" text,
	"padi_number" text,
	"phone" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "instructor_needs_padi_no" CHECK (role = 'STUDENT' OR padi_number IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_dive_center_id_dive_centers_id_fk" FOREIGN KEY ("dive_center_id") REFERENCES "public"."dive_centers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_signoff_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."signoff_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_items" ADD CONSTRAINT "requirement_items_section_id_requirement_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."requirement_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_rules" ADD CONSTRAINT "requirement_rules_item_id_requirement_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."requirement_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_rules" ADD CONSTRAINT "requirement_rules_section_id_requirement_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."requirement_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_sheet_lines" ADD CONSTRAINT "score_sheet_lines_item_id_requirement_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."requirement_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_signer_id_users_id_fk" FOREIGN KEY ("signer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signoff_requests" ADD CONSTRAINT "signoff_requests_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signoff_requests" ADD CONSTRAINT "signoff_requests_item_id_requirement_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."requirement_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signoff_requests" ADD CONSTRAINT "signoff_requests_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signoff_requests" ADD CONSTRAINT "signoff_requests_signature_id_signatures_id_fk" FOREIGN KEY ("signature_id") REFERENCES "public"."signatures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signoff_requests" ADD CONSTRAINT "signoff_requests_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signoff_scores" ADD CONSTRAINT "signoff_scores_request_id_signoff_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."signoff_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signoff_scores" ADD CONSTRAINT "signoff_scores_line_id_score_sheet_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."score_sheet_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_dive_center_id_dive_centers_id_fk" FOREIGN KEY ("dive_center_id") REFERENCES "public"."dive_centers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_log" USING btree ("entity","entity_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_notifications_unread" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST) WHERE read_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_items_section" ON "requirement_items" USING btree ("section_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "score_sheet_lines_item_id_line_number_key" ON "score_sheet_lines" USING btree ("item_id","line_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_approved_attempt" ON "signoff_requests" USING btree ("course_id","item_id","attempt_number") WHERE status = 'APPROVED';--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pending_attempt" ON "signoff_requests" USING btree ("course_id","item_id","attempt_number") WHERE status IN ('DRAFT', 'PENDING');--> statement-breakpoint
CREATE INDEX "idx_requests_inbox" ON "signoff_requests" USING btree ("instructor_id","status","submitted_at");--> statement-breakpoint
CREATE INDEX "idx_requests_course" ON "signoff_requests" USING btree ("course_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "signoff_scores_request_id_line_id_key" ON "signoff_scores" USING btree ("request_id","line_id");--> statement-breakpoint
CREATE INDEX "idx_users_center_role" ON "users" USING btree ("dive_center_id","role") WHERE is_active;--> statement-breakpoint
CREATE VIEW "public"."v_course_item_progress" AS (
  SELECT
    c.id                                   AS course_id,
    ri.id                                  AS item_id,
    ri.section_id,
    ri.required_count,
    COUNT(*) FILTER (WHERE sr.status = 'APPROVED')                  AS approved_count,
    COUNT(*) FILTER (WHERE sr.status IN ('PENDING', 'DRAFT'))       AS pending_count
  FROM courses c
  CROSS JOIN requirement_items ri
  LEFT JOIN signoff_requests sr
         ON sr.course_id = c.id AND sr.item_id = ri.id
  WHERE ri.is_active
  GROUP BY c.id, ri.id
);--> statement-breakpoint
CREATE VIEW "public"."v_course_progress" AS (
  SELECT
    course_id,
    SUM(required_count)                                          AS total_units,
    SUM(LEAST(approved_count, required_count))                   AS approved_units,
    SUM(LEAST(pending_count, GREATEST(required_count - approved_count, 0))) AS pending_units,
    SUM(required_count) - SUM(LEAST(approved_count, required_count))
      - SUM(LEAST(pending_count, GREATEST(required_count - approved_count, 0)))  AS not_started_units,
    ROUND(100.0 * SUM(LEAST(approved_count, required_count)) / NULLIF(SUM(required_count), 0), 1) AS percent_complete
  FROM v_course_item_progress
  GROUP BY course_id
);