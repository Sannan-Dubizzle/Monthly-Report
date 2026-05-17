class ApplicationController < ActionController::API
  before_action :authenticate!

  private

  def authenticate!
    token = request.headers['Authorization']&.sub(/^Bearer /, '')
    @current_member = AuthService.decode_access_token(token) if token
    render json: { error: 'unauthorized', message: 'Authentication required.' }, status: :unauthorized unless @current_member
  end

  def require_permission!(name)
    unless @current_member.can?(name)
      render json: { error: 'forbidden', message: 'You do not have permission to perform this action.' }, status: :forbidden
    end
  end

  def current_member
    @current_member
  end

  def audit(entity_type:, entity_id:, field_name:, old_value:, new_value:)
    AuditLog.create!(
      entity_type: entity_type,
      entity_id: entity_id,
      field_name: field_name,
      old_value: old_value,
      new_value: new_value,
      changed_by: current_member,
      ip_address: request.remote_ip,
      user_agent: request.user_agent
    )
  end
end
