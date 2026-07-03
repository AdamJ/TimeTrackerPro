import type { Knex } from "knex";

// Single-tenant schema: no user_id/RLS, mirroring how guest/localStorage mode
// holds one shared dataset. Mirrors supabase/schema.sql minus auth concerns.
export async function ensureSchema(db: Knex): Promise<void> {
	if (!(await db.schema.hasTable("projects"))) {
		await db.schema.createTable("projects", (t) => {
			t.string("id").primary();
			t.string("name").notNullable();
			t.string("client").notNullable();
			t.decimal("hourly_rate", 10, 2);
			t.string("color");
			t.boolean("is_billable").defaultTo(true);
			t.boolean("archived").defaultTo(false);
			t.timestamp("inserted_at").defaultTo(db.fn.now());
			t.timestamp("updated_at").defaultTo(db.fn.now());
		});
	}

	if (!(await db.schema.hasTable("categories"))) {
		await db.schema.createTable("categories", (t) => {
			t.string("id").primary();
			t.string("name").notNullable();
			t.string("color");
			t.boolean("is_billable").defaultTo(true);
			t.timestamp("inserted_at").defaultTo(db.fn.now());
			t.timestamp("updated_at").defaultTo(db.fn.now());
		});
	}

	if (!(await db.schema.hasTable("clients"))) {
		await db.schema.createTable("clients", (t) => {
			t.string("id").primary();
			t.string("name").notNullable();
			t.boolean("archived").defaultTo(false);
			t.timestamp("created_at").defaultTo(db.fn.now());
			t.string("address_street");
			t.string("address_city");
			t.string("address_state");
			t.string("address_zip");
			t.string("address_country");
			t.string("contact_name");
			t.string("contact_email");
			t.string("contact_website");
		});
	}

	if (!(await db.schema.hasTable("tasks"))) {
		await db.schema.createTable("tasks", (t) => {
			t.string("id").primary();
			t.string("title").notNullable();
			t.text("description");
			t.timestamp("start_time").notNullable();
			t.timestamp("end_time");
			t.bigInteger("duration");
			t.string("project_id");
			t.string("project_name");
			t.string("client");
			t.string("category_id");
			t.string("category_name");
			t.string("day_record_id");
			t.boolean("is_current").defaultTo(false);
			t.timestamp("inserted_at").defaultTo(db.fn.now());
			t.timestamp("updated_at").defaultTo(db.fn.now());
			t.index("is_current");
			t.index("day_record_id");
		});
	}

	if (!(await db.schema.hasTable("archived_days"))) {
		await db.schema.createTable("archived_days", (t) => {
			t.string("id").primary();
			t.string("date").notNullable();
			t.bigInteger("total_duration");
			t.timestamp("start_time").notNullable();
			t.timestamp("end_time").notNullable();
			t.text("notes");
			t.timestamp("inserted_at").defaultTo(db.fn.now());
			t.timestamp("updated_at").defaultTo(db.fn.now());
		});
	}

	if (!(await db.schema.hasTable("current_day"))) {
		await db.schema.createTable("current_day", (t) => {
			t.string("id").primary();
			t.boolean("is_day_started").defaultTo(false);
			t.timestamp("day_start_time");
			t.string("current_task_id");
			t.timestamp("updated_at").defaultTo(db.fn.now());
		});
	}

	if (!(await db.schema.hasTable("todo_items"))) {
		await db.schema.createTable("todo_items", (t) => {
			t.string("id").primary();
			t.text("text").notNullable();
			t.boolean("completed").notNullable().defaultTo(false);
			t.timestamp("created_at").notNullable();
			t.timestamp("completed_at");
		});
	}

	if (!(await db.schema.hasTable("planned_tasks"))) {
		await db.schema.createTable("planned_tasks", (t) => {
			t.string("id").primary();
			t.string("title").notNullable();
			t.text("description");
			t.string("status").notNullable().defaultTo("todo");
			t.string("project_name");
			t.string("client");
			t.string("category_id");
			t.integer("priority").notNullable().defaultTo(0);
			t.string("linked_task_id");
			t.text("time_entries");
			t.bigInteger("time_spent").notNullable().defaultTo(0);
			t.timestamp("created_at").notNullable();
			t.timestamp("updated_at").notNullable().defaultTo(db.fn.now());
		});
	}
}
