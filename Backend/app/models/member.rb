class Member < ApplicationRecord
  has_secure_password

  belongs_to :uc, class_name: 'Unit'
  belongs_to :created_by, class_name: 'Member', optional: true
  has_many :member_roles
  has_many :roles, through: :member_roles
  has_many :refresh_tokens

  validates :name, presence: true
  validates :email, presence: true, uniqueness: { case_sensitive: false },
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :phone, uniqueness: true, allow_nil: true
  validate :uc_must_be_uc_scope

  def active_roles
    roles.joins(:member_roles).where(member_roles: { revoked_at: nil })
  end

  def permissions
    Permission.joins(role_permissions: :role)
              .joins("INNER JOIN member_roles ON member_roles.role_id = roles.id")
              .where(member_roles: { member_id: id, revoked_at: nil })
              .distinct
  end

  def can?(permission_name)
    permissions.exists?(name: permission_name)
  end

  private

  def uc_must_be_uc_scope
    return unless uc
    errors.add(:uc_id, 'must reference a UC-level unit') unless uc.uc?
  end
end
