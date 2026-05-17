module Api
  module V1
    class MembersController < ApplicationController
      def index
        require_permission!('members:list') and return unless performed?
        scope = Member.includes(:uc, member_roles: :role)
        scope = scope.where(uc_id: params[:uc_id]) if params[:uc_id]
        if params[:role]
          scope = scope.joins(member_roles: :role).where(roles: { name: params[:role] }, member_roles: { revoked_at: nil })
        end
        scope = apply_member_filter(scope)
        total = scope.count
        scope = scope.page(params[:page]).per(params[:per_page] || 20)
        render json: {
          data: scope.map { |m| member_list_json(m) },
          meta: { page: (params[:page] || 1).to_i, per_page: (params[:per_page] || 20).to_i, total: total }
        }
      end

      def show
        require_permission!('members:read') and return unless performed?
        member = Member.includes(:uc, member_roles: :role).find(params[:id])
        render json: member_detail_json(member)
      end

      def create
        require_permission!('members:create') and return unless performed?
        member = Member.new(member_params.merge(created_by: current_member))
        if member.save
          render json: member_created_json(member), status: :created
        elsif member.errors[:email].any?
          render json: { error: 'duplicate_contact', message: 'A member with this email already exists.' }, status: :conflict
        else
          render json: { errors: member.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def assign_role
        require_permission!('members:roles_assign') and return unless performed?
        unless current_member.active_roles.exists?(name: 'ZILA_PRESIDENT')
          return render json: { error: 'forbidden', message: 'Only a Zila President can assign roles.' }, status: :forbidden
        end
        member = Member.find(params[:id])
        role = Role.find_by!(name: params[:role_name])
        mr = MemberRole.find_or_initialize_by(member: member, role: role)
        mr.granted_by = current_member
        mr.revoked_at = nil
        mr.granted_at = Time.current
        mr.save!
        render json: { member_id: member.id, role: role.name, granted_by: current_member.id, granted_at: mr.granted_at }
      end

      def revoke_role
        require_permission!('members:roles_revoke') and return unless performed?
        unless current_member.active_roles.exists?(name: 'ZILA_PRESIDENT')
          return render json: { error: 'forbidden', message: 'Only a Zila President can revoke roles.' }, status: :forbidden
        end
        member = Member.find(params[:id])
        role = Role.find_by!(name: params[:role_name])
        mr = MemberRole.find_by(member: member, role: role, revoked_at: nil)
        return render json: { error: 'not_found', message: "This member does not have the role #{params[:role_name]}." }, status: :not_found unless mr
        mr.update!(revoked_at: Time.current)
        render json: { member_id: member.id, role: role.name, revoked_by: current_member.id, revoked_at: mr.revoked_at }
      end

      private

      def member_params
        params.permit(:name, :email, :phone, :password, :uc_id)
      end

      def apply_member_filter(scope)
        roles = current_member.member_roles.where(revoked_at: nil).includes(:role).map { |mr| mr.role.name }
        return scope if roles.include?('ZILA_PRESIDENT') || roles.include?('ZILA_SECRETARY')
        member_uc = current_member.uc
        if roles.any? { |r| r.start_with?('ZONE_') }
          zone = member_uc.parent
          uc_ids = zone.children.pluck(:id)
          scope.where(uc_id: uc_ids)
        else
          scope.where(uc_id: member_uc.id)
        end
      end

      def member_list_json(m)
        active_roles = m.member_roles.select { |mr| mr.revoked_at.nil? }.map { |mr| mr.role.name }
        { id: m.id, name: m.name, email: m.email, phone: m.phone,
          uc: { id: m.uc.id, name: m.uc.name }, roles: active_roles }
      end

      def member_detail_json(m)
        member_list_json(m).merge(is_active: m.is_active, created_at: m.created_at)
      end

      def member_created_json(m)
        { id: m.id, name: m.name, email: m.email, phone: m.phone, uc_id: m.uc_id, is_active: m.is_active, created_at: m.created_at }
      end
    end
  end
end
