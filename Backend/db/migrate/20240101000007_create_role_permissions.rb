class CreateRolePermissions < ActiveRecord::Migration[7.1]
  def change
    create_table :role_permissions, id: :uuid do |t|
      t.references :role, type: :uuid, null: false, foreign_key: true
      t.references :permission, type: :uuid, null: false, foreign_key: true
      t.datetime :created_at, null: false
    end
    add_index :role_permissions, [:role_id, :permission_id], unique: true
  end
end
