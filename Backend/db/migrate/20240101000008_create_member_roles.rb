class CreateMemberRoles < ActiveRecord::Migration[7.1]
  def change
    create_table :member_roles, id: :uuid do |t|
      t.references :member, type: :uuid, null: false, foreign_key: true
      t.references :role, type: :uuid, null: false, foreign_key: true
      t.references :granted_by, type: :uuid, foreign_key: { to_table: :members }, null: true
      t.datetime :granted_at, null: false, default: -> { 'NOW()' }
      t.datetime :revoked_at
    end
    add_index :member_roles, [:member_id, :role_id], unique: true
  end
end
