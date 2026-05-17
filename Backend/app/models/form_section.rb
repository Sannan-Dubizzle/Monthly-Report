class FormSection < ApplicationRecord
  enum :scope_level, { zila: 0, zone: 1, uc: 2 }

  has_many :form_section_fields, foreign_key: :section_id, dependent: :destroy
  has_many :form_fields, through: :form_section_fields, source: :field

  validates :key, presence: true, uniqueness: true
  validates :label, presence: true
  validates :order_index, uniqueness: { scope: :scope_level }
end
