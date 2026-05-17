class Role < ApplicationRecord
  NAMES = %w[UC_PRESIDENT UC_SECRETARY ZONE_PRESIDENT ZONE_SECRETARY ZILA_PRESIDENT ZILA_SECRETARY].freeze

  has_many :role_permissions, dependent: :destroy
  has_many :permissions, through: :role_permissions
  has_many :member_roles, dependent: :destroy
  has_many :members, through: :member_roles

  validates :name, presence: true, uniqueness: true
end
