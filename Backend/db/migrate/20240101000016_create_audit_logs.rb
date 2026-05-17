class CreateAuditLogs < ActiveRecord::Migration[7.1]
  def change
    create_table :audit_logs, id: :uuid do |t|
      t.string :entity_type, null: false
      t.uuid :entity_id, null: false
      t.string :field_name, null: false
      t.text :old_value
      t.text :new_value
      t.references :changed_by, type: :uuid, foreign_key: { to_table: :members }, null: true
      t.datetime :changed_at, null: false, default: -> { 'NOW()' }
      t.string :ip_address
      t.text :user_agent
    end
    add_index :audit_logs, [:entity_type, :entity_id, :changed_at]
  end
end
