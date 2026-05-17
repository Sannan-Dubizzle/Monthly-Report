class ReportFieldValue < ApplicationRecord
  belongs_to :report, class_name: 'MonthlyReport'
  belongs_to :field, class_name: 'FormField'

  validates :report_id, uniqueness: { scope: :field_id }
end
