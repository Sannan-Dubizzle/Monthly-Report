class FormSectionField < ApplicationRecord
  belongs_to :section, class_name: 'FormSection'
  belongs_to :field, class_name: 'FormField'

  validates :section_id, uniqueness: { scope: :field_id }
  validates :order_index, uniqueness: { scope: :section_id }
end
