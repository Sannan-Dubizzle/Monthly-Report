class MemberRole < ApplicationRecord
  belongs_to :member
  belongs_to :role
  belongs_to :granted_by, class_name: 'Member', optional: true

  scope :active, -> { where(revoked_at: nil) }

  validates :member_id, uniqueness: { scope: :role_id }
end
