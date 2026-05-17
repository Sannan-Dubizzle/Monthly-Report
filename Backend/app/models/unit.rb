class Unit < ApplicationRecord
  enum :scope_level, { zila: 0, zone: 1, uc: 2 }

  belongs_to :parent, class_name: 'Unit', optional: true
  has_many :children, class_name: 'Unit', foreign_key: :parent_id
  belongs_to :president, class_name: 'Member', optional: true
  has_many :members, foreign_key: :uc_id
  has_many :monthly_reports

  validates :name, presence: true
  validate :parent_scope_consistency
  validate :root_only_for_zila

  def ancestors
    result = []
    current = self.parent
    while current
      result << current
      current = current.parent
    end
    result
  end

  private

  def root_only_for_zila
    if zila? && parent_id.present?
      errors.add(:parent_id, 'must be nil for Zila')
    elsif (zone? || uc?) && parent_id.blank?
      errors.add(:parent_id, 'is required for Zone and UC')
    end
  end

  def parent_scope_consistency
    return unless parent
    if zone? && !parent.zila?
      errors.add(:parent_id, 'A Zone must have a Zila as its parent')
    elsif uc? && !parent.zone?
      errors.add(:parent_id, 'A UC must have a Zone as its parent')
    end
  end
end
