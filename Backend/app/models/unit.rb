class Unit < ApplicationRecord
  SCOPE_LEVELS = %w[Zila Zone UC].freeze

  belongs_to :parent, class_name: 'Unit', optional: true
  has_many :children, class_name: 'Unit', foreign_key: :parent_id
  belongs_to :president, class_name: 'Member', optional: true
  has_many :members, foreign_key: :uc_id
  has_many :monthly_reports

  validates :name, presence: true
  validates :scope_level, inclusion: { in: SCOPE_LEVELS }
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
    if scope_level == 'Zila' && parent_id.present?
      errors.add(:parent_id, 'must be nil for Zila')
    elsif scope_level.in?(%w[Zone UC]) && parent_id.blank?
      errors.add(:parent_id, 'is required for Zone and UC')
    end
  end

  def parent_scope_consistency
    return unless parent
    expected = { 'Zone' => 'Zila', 'UC' => 'Zone' }
    if expected[scope_level] && parent.scope_level != expected[scope_level]
      errors.add(:parent_id, "A #{scope_level} must have a #{expected[scope_level]} as its parent")
    end
  end
end
