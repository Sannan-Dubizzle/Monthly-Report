class MonthlyReport < ApplicationRecord
  STATUSES = %w[draft zone_locked finalized].freeze

  belongs_to :unit
  belongs_to :president_member, class_name: 'Member', optional: true
  belongs_to :secretary_member, class_name: 'Member', optional: true
  belongs_to :created_by, class_name: 'Member', optional: true
  has_many :report_activities, foreign_key: :report_id, dependent: :destroy
  has_many :report_field_values, foreign_key: :report_id, dependent: :destroy

  validates :month, presence: true
  validates :status, inclusion: { in: STATUSES }
  validates :unit_id, uniqueness: { scope: :month }

  def editable_by?(member)
    return false if status == 'finalized'
    return true if member.active_roles.exists?(name: 'ZILA_PRESIDENT')
    return false if status == 'zone_locked'
    true
  end
end
