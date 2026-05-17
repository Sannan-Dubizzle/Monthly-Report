class CreateMonthlyReports < ActiveRecord::Migration[7.1]
  def change
    create_table :monthly_reports, id: :uuid do |t|
      t.references :unit, type: :uuid, null: false, foreign_key: { to_table: :units }
      t.date :month, null: false
      t.references :president_member, type: :uuid, foreign_key: { to_table: :members }, null: true
      t.references :secretary_member, type: :uuid, foreign_key: { to_table: :members }, null: true
      t.string :status, null: false, default: 'draft'  # 'draft', 'zone_locked', 'finalized'
      t.datetime :locked_at
      t.datetime :finalized_at
      t.references :created_by, type: :uuid, foreign_key: { to_table: :members }, null: true
      t.timestamps
    end
    add_index :monthly_reports, [:unit_id, :month], unique: true
  end
end
