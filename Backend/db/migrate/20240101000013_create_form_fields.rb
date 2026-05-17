class CreateFormFields < ActiveRecord::Migration[7.1]
  def change
    create_table :form_fields, id: :uuid do |t|
      t.string :key, null: false
      t.string :label, null: false
      t.string :field_type, null: false  # text, number, boolean, date, dropdown, member_picker, activity_list
      t.boolean :is_required, null: false, default: false
      t.string :prefill_source
      t.jsonb :options
      t.jsonb :validation
      t.string :helper_text
      t.boolean :is_active, null: false, default: true
      t.datetime :created_at, null: false
    end
    add_index :form_fields, :key, unique: true
  end
end
