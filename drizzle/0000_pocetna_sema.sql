CREATE TABLE "appointments" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "appointments_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"date" date NOT NULL,
	"start_min" integer NOT NULL,
	"duration_min" integer NOT NULL,
	"vehicle_id" uuid,
	"customer_id" uuid,
	"vehicle_text" text,
	"customer_name" text,
	"phone" text,
	"reason" text NOT NULL,
	"note" text,
	"status" text NOT NULL,
	"order_id" uuid
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "attachments_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"order_id" uuid,
	"category" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"file" text NOT NULL,
	"thumb" text NOT NULL,
	"original_name" text
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "customers_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"phones" jsonb NOT NULL,
	"email" text,
	"tax_id" text,
	"address" text,
	"note" text,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "expenses_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"date" date NOT NULL,
	"category" text NOT NULL,
	"amount" bigint NOT NULL,
	"description" text NOT NULL,
	"supplier_id" uuid,
	"order_id" uuid,
	"paid_date" date,
	"due_date" date,
	"document_no" text,
	"note" text,
	"parts_order_id" uuid
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "invoices_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"number" text NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"issued_date" date NOT NULL,
	"customer" jsonb NOT NULL,
	"vehicle" jsonb NOT NULL,
	"lines" jsonb NOT NULL,
	"total" bigint NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"ip" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"until" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta" (
	"id" integer PRIMARY KEY NOT NULL,
	"version" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "odometer_readings" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "odometer_readings_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"km" integer NOT NULL,
	"date" date NOT NULL,
	"source" text NOT NULL,
	"order_id" uuid,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "order_items_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"order_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"qty_milli" integer NOT NULL,
	"unit" text NOT NULL,
	"unit_price" bigint NOT NULL,
	"unit_cost" bigint,
	"discount_bp" integer NOT NULL,
	"part_number" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "orders_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"number" text NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" text NOT NULL,
	"received_date" date NOT NULL,
	"km_in" integer,
	"complaint" text NOT NULL,
	"work_done" text,
	"internal_note" text,
	"completed_date" date,
	"km_out" integer,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text
);
--> statement-breakpoint
CREATE TABLE "ownerships" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "ownerships_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"valid_from" date NOT NULL,
	"valid_to" date,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts_orders" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "parts_orders_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"number" text NOT NULL,
	"supplier_id" uuid,
	"order_id" uuid,
	"vehicle_id" uuid,
	"status" text NOT NULL,
	"needed_by" date,
	"note" text,
	"sent_at" timestamp with time zone,
	"lines" jsonb NOT NULL,
	"share_token_hash" text,
	"share_created_at" timestamp with time zone,
	"share_opens" integer NOT NULL,
	"share_last_opened_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "payments_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "reminders_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"order_id" uuid,
	"title" text NOT NULL,
	"due_date" date,
	"due_km" integer,
	"status" text NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by_order_id" uuid,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sequences" (
	"tenant_id" text NOT NULL,
	"key" text NOT NULL,
	"value" integer NOT NULL,
	CONSTRAINT "sequences_tenant_id_key_pk" PRIMARY KEY("tenant_id","key")
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "shares_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"customer_id" uuid,
	"token_hash" text,
	"expires_at" date NOT NULL,
	"revoked_at" timestamp with time zone,
	"opens" integer NOT NULL,
	"last_opened_at" timestamp with time zone,
	"snapshot" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "suppliers_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"contact_person" text,
	"note" text,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "vehicles_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"plate" text,
	"vin" text,
	"make" text NOT NULL,
	"model" text,
	"year" integer,
	"fuel" text,
	"engine" text,
	"power_kw" integer,
	"color" text,
	"registration_expires" date,
	"note" text,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_parts_order_id_parts_orders_id_fk" FOREIGN KEY ("parts_order_id") REFERENCES "public"."parts_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odometer_readings" ADD CONSTRAINT "odometer_readings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownerships" ADD CONSTRAINT "ownerships_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownerships" ADD CONSTRAINT "ownerships_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts_orders" ADD CONSTRAINT "parts_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts_orders" ADD CONSTRAINT "parts_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts_orders" ADD CONSTRAINT "parts_orders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_closed_by_order_id_orders_id_fk" FOREIGN KEY ("closed_by_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_date" ON "appointments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "attachments_order" ON "attachments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "expenses_date" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "expenses_order" ON "expenses" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number" ON "invoices" USING btree ("tenant_id","number");--> statement-breakpoint
CREATE INDEX "invoices_order" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "odometer_vehicle" ON "odometer_readings" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number" ON "orders" USING btree ("tenant_id","number");--> statement-breakpoint
CREATE INDEX "orders_vehicle" ON "orders" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "orders_customer" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "ownerships_vehicle" ON "ownerships" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "ownerships_customer" ON "ownerships" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parts_orders_number" ON "parts_orders" USING btree ("tenant_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "parts_orders_token" ON "parts_orders" USING btree ("share_token_hash");--> statement-breakpoint
CREATE INDEX "payments_order" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "reminders_vehicle" ON "reminders" USING btree ("vehicle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shares_token" ON "shares" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "shares_vehicle" ON "shares" USING btree ("vehicle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_plate_active" ON "vehicles" USING btree ("tenant_id","plate") WHERE "vehicles"."archived_at" is null and "vehicles"."plate" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_vin_active" ON "vehicles" USING btree ("tenant_id","vin") WHERE "vehicles"."archived_at" is null and "vehicles"."vin" is not null;--> statement-breakpoint
-- početna verzija podataka (skladište je povećava pri svakom upisu)
INSERT INTO "meta" ("id", "version") VALUES (1, 0) ON CONFLICT DO NOTHING;
