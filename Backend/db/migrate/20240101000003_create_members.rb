class CreateMembers < ActiveRecord::Migration[7.1]
  def change
    create_table :members, id: :uuid do |t|
      t.string :name, null: false
      t.string :email, null: false
      t.string :phone
      t.string :password_digest, null: false
      t.references :uc, type: :uuid, foreign_key: { to_table: :units }, null: false
      t.references :created_by, type: :uuid, foreign_key: { to_table: :members }, null: true
      t.boolean :is_active, null: false, default: true
      t.timestamps
    end
    add_index :members, :email, unique: true
    add_index :members, :phone, unique: true
  end
end
