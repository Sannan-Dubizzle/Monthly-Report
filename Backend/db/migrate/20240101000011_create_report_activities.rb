class CreateReportActivities < ActiveRecord::Migration[7.1]
  def change
    create_table :report_activities, id: :uuid do |t|
      t.references :report, type: :uuid, null: false, foreign_key: { to_table: :monthly_reports }
      t.references :definition, type: :uuid, foreign_key: { to_table: :activity_definitions }, null: true
      t.string :name, null: false
      t.integer :occurrences, null: false, default: 1
      t.integer :avg_attendance
      t.string :conductor
      t.text :notes
      t.datetime :created_at, null: false
    end
  end
end
