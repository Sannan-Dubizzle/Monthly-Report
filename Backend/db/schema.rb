# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2024_01_01_000017) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pgcrypto"
  enable_extension "plpgsql"
  enable_extension "uuid-ossp"

  create_table "activity_definitions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.integer "scope_level", default: 2, null: false
    t.integer "compulsory_per_month", default: 0, null: false
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
  end

  create_table "audit_logs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "entity_type", null: false
    t.uuid "entity_id", null: false
    t.string "field_name", null: false
    t.text "old_value"
    t.text "new_value"
    t.uuid "changed_by_id"
    t.datetime "changed_at", default: -> { "now()" }, null: false
    t.string "ip_address"
    t.text "user_agent"
    t.index ["changed_by_id"], name: "index_audit_logs_on_changed_by_id"
    t.index ["entity_type", "entity_id", "changed_at"], name: "index_audit_logs_on_entity_type_and_entity_id_and_changed_at"
  end

  create_table "form_fields", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "key", null: false
    t.string "label", null: false
    t.string "field_type", null: false
    t.boolean "is_required", default: false, null: false
    t.string "prefill_source"
    t.jsonb "options"
    t.jsonb "validation"
    t.string "helper_text"
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_form_fields_on_key", unique: true
  end

  create_table "form_section_fields", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "section_id", null: false
    t.uuid "field_id", null: false
    t.integer "order_index", null: false
    t.datetime "created_at", null: false
    t.index ["field_id"], name: "index_form_section_fields_on_field_id"
    t.index ["section_id", "field_id"], name: "index_form_section_fields_on_section_id_and_field_id", unique: true
    t.index ["section_id", "order_index"], name: "index_form_section_fields_on_section_id_and_order_index", unique: true
    t.index ["section_id"], name: "index_form_section_fields_on_section_id"
  end

  create_table "form_sections", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "key", null: false
    t.string "label", null: false
    t.integer "scope_level", null: false
    t.integer "order_index", null: false
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_form_sections_on_key", unique: true
    t.index ["scope_level", "order_index"], name: "index_form_sections_on_scope_level_and_order_index", unique: true
  end

  create_table "member_roles", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "member_id", null: false
    t.uuid "role_id", null: false
    t.uuid "granted_by_id"
    t.datetime "granted_at", default: -> { "now()" }, null: false
    t.datetime "revoked_at"
    t.index ["granted_by_id"], name: "index_member_roles_on_granted_by_id"
    t.index ["member_id", "role_id"], name: "index_member_roles_on_member_id_and_role_id", unique: true
    t.index ["member_id"], name: "index_member_roles_on_member_id"
    t.index ["role_id"], name: "index_member_roles_on_role_id"
  end

  create_table "members", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.string "phone"
    t.string "password_digest", null: false
    t.uuid "uc_id", null: false
    t.uuid "created_by_id"
    t.boolean "is_active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_members_on_created_by_id"
    t.index ["email"], name: "index_members_on_email", unique: true
    t.index ["phone"], name: "index_members_on_phone", unique: true
    t.index ["uc_id"], name: "index_members_on_uc_id"
  end

  create_table "monthly_reports", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "unit_id", null: false
    t.date "month", null: false
    t.uuid "president_member_id"
    t.uuid "secretary_member_id"
    t.string "status", default: "draft", null: false
    t.datetime "locked_at"
    t.datetime "finalized_at"
    t.uuid "created_by_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_monthly_reports_on_created_by_id"
    t.index ["president_member_id"], name: "index_monthly_reports_on_president_member_id"
    t.index ["secretary_member_id"], name: "index_monthly_reports_on_secretary_member_id"
    t.index ["unit_id", "month"], name: "index_monthly_reports_on_unit_id_and_month", unique: true
    t.index ["unit_id"], name: "index_monthly_reports_on_unit_id"
  end

  create_table "permissions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "method", null: false
    t.string "path", null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.index ["method", "path"], name: "index_permissions_on_method_and_path", unique: true
    t.index ["name"], name: "index_permissions_on_name", unique: true
  end

  create_table "refresh_tokens", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "member_id", null: false
    t.string "token_hash", null: false
    t.datetime "expires_at", null: false
    t.datetime "revoked_at"
    t.datetime "created_at", null: false
    t.index ["member_id"], name: "index_refresh_tokens_on_member_id"
    t.index ["token_hash"], name: "index_refresh_tokens_on_token_hash", unique: true
  end

  create_table "report_activities", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "report_id", null: false
    t.uuid "definition_id"
    t.string "name", null: false
    t.integer "occurrences", default: 1, null: false
    t.integer "avg_attendance"
    t.string "conductor"
    t.text "notes"
    t.datetime "created_at", null: false
    t.index ["definition_id"], name: "index_report_activities_on_definition_id"
    t.index ["report_id"], name: "index_report_activities_on_report_id"
  end

  create_table "report_field_values", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "report_id", null: false
    t.uuid "field_id", null: false
    t.text "value"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["field_id"], name: "index_report_field_values_on_field_id"
    t.index ["report_id", "field_id"], name: "index_report_field_values_on_report_id_and_field_id", unique: true
    t.index ["report_id"], name: "index_report_field_values_on_report_id"
  end

  create_table "role_permissions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "role_id", null: false
    t.uuid "permission_id", null: false
    t.datetime "created_at", null: false
    t.index ["permission_id"], name: "index_role_permissions_on_permission_id"
    t.index ["role_id", "permission_id"], name: "index_role_permissions_on_role_id_and_permission_id", unique: true
    t.index ["role_id"], name: "index_role_permissions_on_role_id"
  end

  create_table "roles", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.index ["name"], name: "index_roles_on_name", unique: true
  end

  create_table "units", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.uuid "parent_id"
    t.integer "scope_level", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.uuid "president_id"
    t.index ["parent_id"], name: "index_units_on_parent_id"
    t.index ["president_id"], name: "index_units_on_president_id"
  end

  add_foreign_key "audit_logs", "members", column: "changed_by_id"
  add_foreign_key "form_section_fields", "form_fields", column: "field_id"
  add_foreign_key "form_section_fields", "form_sections", column: "section_id"
  add_foreign_key "member_roles", "members"
  add_foreign_key "member_roles", "members", column: "granted_by_id"
  add_foreign_key "member_roles", "roles"
  add_foreign_key "members", "members", column: "created_by_id"
  add_foreign_key "members", "units", column: "uc_id"
  add_foreign_key "monthly_reports", "members", column: "created_by_id"
  add_foreign_key "monthly_reports", "members", column: "president_member_id"
  add_foreign_key "monthly_reports", "members", column: "secretary_member_id"
  add_foreign_key "monthly_reports", "units"
  add_foreign_key "refresh_tokens", "members"
  add_foreign_key "report_activities", "activity_definitions", column: "definition_id"
  add_foreign_key "report_activities", "monthly_reports", column: "report_id"
  add_foreign_key "report_field_values", "form_fields", column: "field_id"
  add_foreign_key "report_field_values", "monthly_reports", column: "report_id"
  add_foreign_key "role_permissions", "permissions"
  add_foreign_key "role_permissions", "roles"
  add_foreign_key "units", "members", column: "president_id"
  add_foreign_key "units", "units", column: "parent_id"
end
