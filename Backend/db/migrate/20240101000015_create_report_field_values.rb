class CreateReportFieldValues < ActiveRecord::Migration[7.1]
  def change
    create_table :report_field_values, id: :uuid do |t|
      t.references :report, type: :uuid, null: false, foreign_key: { to_table: :monthly_reports }
      t.references :field, type: :uuid, null: false, foreign_key: { to_table: :form_fields }
      t.text :value
      t.timestamps
    end
    add_index :report_field_values, [:report_id, :field_id], unique: true
  end
end
