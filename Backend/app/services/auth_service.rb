require 'jwt'
require 'digest'
require 'securerandom'

class AuthService
  SECRET = Rails.application.secret_key_base
  ACCESS_TOKEN_TTL = 86400       # 24 hours
  REFRESH_TOKEN_TTL = 30.days

  def self.login(email:, password:)
    member = Member.find_by(email: email.downcase)
    return nil unless member&.authenticate(password)
    return nil unless member.is_active

    access_token = generate_access_token(member)
    raw_refresh, token_hash = generate_refresh_token
    RefreshToken.create!(member: member, token_hash: token_hash, expires_at: REFRESH_TOKEN_TTL.from_now)

    { access_token: access_token, refresh_token: raw_refresh, expires_in: ACCESS_TOKEN_TTL, member: member }
  end

  def self.refresh(raw_token)
    hash = Digest::SHA256.hexdigest(raw_token)
    rt = RefreshToken.valid.find_by(token_hash: hash)
    return nil unless rt

    access_token = generate_access_token(rt.member)
    { access_token: access_token, expires_in: ACCESS_TOKEN_TTL }
  end

  def self.logout(raw_token)
    hash = Digest::SHA256.hexdigest(raw_token)
    rt = RefreshToken.find_by(token_hash: hash)
    rt&.update(revoked_at: Time.current)
  end

  def self.decode_access_token(token)
    payload = JWT.decode(token, SECRET, true, algorithm: 'HS256').first
    member_id = payload['sub']
    Member.find_by(id: member_id)
  rescue JWT::DecodeError
    nil
  end

  private

  def self.generate_access_token(member)
    payload = { sub: member.id, exp: ACCESS_TOKEN_TTL.seconds.from_now.to_i }
    JWT.encode(payload, SECRET, 'HS256')
  end

  def self.generate_refresh_token
    raw = SecureRandom.hex(64)
    hash = Digest::SHA256.hexdigest(raw)
    [raw, hash]
  end
end
