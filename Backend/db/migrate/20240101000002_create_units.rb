class CreateUnits < ActiveRecord::Migration[7.1]
  def change
    create_table :units, id: :uuid do |t|
      t.string :name, null: false
      t.references :parent, type: :uuid, foreign_key: { to_table: :units }, null: true
      t.integer :scope_level, null: false
      t.timestamps
    end
  end
end
