class CreateFormSections < ActiveRecord::Migration[7.1]
  def change
    create_table :form_sections, id: :uuid do |t|
      t.string :key, null: false
      t.string :label, null: false
      t.integer :scope_level, null: false
      t.integer :order_index, null: false
      t.boolean :is_active, null: false, default: true
      t.datetime :created_at, null: false
    end
    add_index :form_sections, :key, unique: true
    add_index :form_sections, [:scope_level, :order_index], unique: true
  end
end
