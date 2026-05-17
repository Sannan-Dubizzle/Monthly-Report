class AuditLog < ApplicationRecord
  belongs_to :changed_by, class_name: 'Member', optional: true

  validates :entity_type, :entity_id, :field_name, presence: true
end
