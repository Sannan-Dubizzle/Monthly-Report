class FormSection < ApplicationRecord
  SCOPE_LEVELS = %w[UC Zone Zila].freeze

  has_many :form_section_fields, foreign_key: :section_id, dependent: :destroy
  has_many :form_fields, through: :form_section_fields, source: :field

  validates :key, presence: true, uniqueness: true
  validates :label, presence: true
  validates :scope_level, inclusion: { in: SCOPE_LEVELS }
  validates :order_index, uniqueness: { scope: :scope_level }
end
