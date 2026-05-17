class ActivityDefinition < ApplicationRecord
  SCOPE_LEVELS = %w[UC Zone Zila].freeze

  has_many :report_activities, foreign_key: :definition_id

  validates :name, presence: true
  validates :scope_level, inclusion: { in: SCOPE_LEVELS }
  validates :compulsory_per_month, numericality: { greater_than_or_equal_to: 0 }
end
