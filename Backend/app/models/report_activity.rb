class ReportActivity < ApplicationRecord
  belongs_to :report, class_name: 'MonthlyReport'
  belongs_to :definition, class_name: 'ActivityDefinition', optional: true

  validates :name, presence: true
  validates :occurrences, numericality: { greater_than_or_equal_to: 1 }
  validates :avg_attendance, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  def total_attendance
    return nil if occurrences.nil? || avg_attendance.nil?
    occurrences * avg_attendance
  end
end
