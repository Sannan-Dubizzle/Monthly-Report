module Api
  module V1
    class AuditLogsController < ApplicationController
      def index
        require_permission!('audit_logs:read') and return unless performed?
        scope = AuditLog.includes(:changed_by)
        scope = scope.where(entity_type: params[:entity_type]) if params[:entity_type]
        scope = scope.where(entity_id: params[:entity_id]) if params[:entity_id]
        render json: { data: scope.order(changed_at: :desc).map { |l| log_json(l) } }
      end

      private

      def log_json(l)
        { id: l.id, entity_type: l.entity_type, entity_id: l.entity_id, field_name: l.field_name,
          old_value: l.old_value, new_value: l.new_value,
          changed_by: l.changed_by ? { id: l.changed_by.id, name: l.changed_by.name } : nil,
          changed_at: l.changed_at }
      end
    end
  end
end
