class CreateFormSectionFields < ActiveRecord::Migration[7.1]
  def change
    create_table :form_section_fields, id: :uuid do |t|
      t.references :section, type: :uuid, null: false, foreign_key: { to_table: :form_sections }
      t.references :field, type: :uuid, null: false, foreign_key: { to_table: :form_fields }
      t.integer :order_index, null: false
      t.datetime :created_at, null: false
    end
    add_index :form_section_fields, [:section_id, :field_id], unique: true
    add_index :form_section_fields, [:section_id, :order_index], unique: true
  end
end
