CREATE TYPE "public"."category" AS ENUM('chair', 'sofa', 'woodwork');--> statement-breakpoint
CREATE TYPE "public"."section" AS ENUM('raw', 'accessory');--> statement-breakpoint
CREATE TABLE "cost_sheet_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sheet_id" integer NOT NULL,
	"section" "section" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"material_id" integer,
	"name" text DEFAULT '' NOT NULL,
	"position" text,
	"size" text,
	"yield_qty" double precision DEFAULT 1 NOT NULL,
	"qty" double precision DEFAULT 1 NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_sheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"category" "category" NOT NULL,
	"dimensions" text,
	"customer" text,
	"note" text,
	"is_template" boolean DEFAULT false NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"markup_rate" double precision DEFAULT 0.3 NOT NULL,
	"labor_rate" double precision,
	"overhead_rate" double precision,
	"damage_rate" double precision,
	"source_file" text,
	"excel_total" double precision,
	"total_cost" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group" text DEFAULT 'อื่นๆ' NOT NULL,
	"section" "section" DEFAULT 'raw' NOT NULL,
	"unit" text DEFAULT 'แผ่น' NOT NULL,
	"default_yield" double precision DEFAULT 1 NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"labor_rate" double precision DEFAULT 0.4 NOT NULL,
	"overhead_rate" double precision DEFAULT 0.15 NOT NULL,
	"damage_rate" double precision DEFAULT 0.03 NOT NULL,
	"default_markup" double precision DEFAULT 0.3 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cost_sheet_items" ADD CONSTRAINT "cost_sheet_items_sheet_id_cost_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."cost_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_sheet_items" ADD CONSTRAINT "cost_sheet_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cost_sheet_items_sheet_idx" ON "cost_sheet_items" USING btree ("sheet_id");--> statement-breakpoint
CREATE INDEX "cost_sheets_category_idx" ON "cost_sheets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "cost_sheets_updated_idx" ON "cost_sheets" USING btree ("updated_at");