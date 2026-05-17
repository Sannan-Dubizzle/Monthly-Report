class FormField < ApplicationRecord
  FIELD_TYPES = %w[text number boolean date dropdown member_picker activity_list].freeze

  has_many :form_section_fields, foreign_key: :field_id, dependent: :destroy
  has_many :form_sections, through: :form_section_fields, source: :section
  has_many :report_field_values, foreign_key: :field_id, dependent: :restrict_with_error

  validates :key, presence: true, uniqueness: true
  validates :label, presence: true
  validates :field_type, inclusion: { in: FIELD_TYPES }
end
