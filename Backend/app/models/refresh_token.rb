class RefreshToken < ApplicationRecord
  belongs_to :member

  scope :valid, -> { where(revoked_at: nil).where('expires_at > ?', Time.current) }

  validates :token_hash, presence: true, uniqueness: true
  validates :expires_at, presence: true
end
