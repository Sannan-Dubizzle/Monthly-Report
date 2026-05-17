class ActivityDefinition < ApplicationRecord
  enum :scope_level, { zila: 0, zone: 1, uc: 2 }

  has_many :report_activities, foreign_key: :definition_id

  validates :name, presence: true
  validates :compulsory_per_month, numericality: { greater_than_or_equal_to: 0 }
end
