class CreateActivityDefinitions < ActiveRecord::Migration[7.1]
  def change
    create_table :activity_definitions, id: :uuid do |t|
      t.string :name, null: false
      t.string :scope_level, null: false, default: 'UC'
      t.integer :compulsory_per_month, null: false, default: 0
      t.boolean :is_active, null: false, default: true
      t.datetime :created_at, null: false
    end
  end
end
