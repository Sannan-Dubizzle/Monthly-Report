class CreatePermissions < ActiveRecord::Migration[7.1]
  def change
    create_table :permissions, id: :uuid do |t|
      t.string :name, null: false
      t.string :method, null: false
      t.string :path, null: false
      t.text :description
      t.datetime :created_at, null: false
    end
    add_index :permissions, :name, unique: true
    add_index :permissions, [:method, :path], unique: true
  end
end
