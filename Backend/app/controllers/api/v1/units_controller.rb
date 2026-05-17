module Api
  module V1
    class UnitsController < ApplicationController
      def index
        require_permission!('units:list') and return unless performed?
        scope = Unit.includes(:president)
        scope = scope.where(scope_level: params[:scope_level]) if params[:scope_level]
        scope = scope.where(parent_id: params[:parent_id]) if params[:parent_id]
        scope = apply_unit_filter(scope)
        render json: { data: scope.map { |u| unit_json(u) }, meta: { total: scope.size } }
      end

      def show
        require_permission!('units:read') and return unless performed?
        unit = find_accessible_unit(params[:id])
        return render json: { error: 'not_found' }, status: :not_found unless unit
        render json: unit_detail_json(unit)
      end

      def create
        require_permission!('units:create') and return unless performed?
        unit = Unit.new(unit_params)
        if unit.save
          render json: unit_detail_json(unit), status: :created
        else
          render json: { errors: unit.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        require_permission!('units:update') and return unless performed?
        unit = Unit.find(params[:id])
        if params[:president_id]
          president = Member.find_by(id: params[:president_id], is_active: true)
          return render json: { error: 'invalid_president', message: 'President must be an active member.' }, status: :unprocessable_entity unless president
        end
        if unit.update(unit_params)
          render json: unit_detail_json(unit)
        else
          render json: { errors: unit.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def unit_params
        params.permit(:name, :parent_id, :president_id)
      end

      def apply_unit_filter(scope)
        roles = current_member.member_roles.where(revoked_at: nil).includes(:role).map { |mr| mr.role.name }
        return scope if roles.include?('ZILA_PRESIDENT') || roles.include?('ZILA_SECRETARY')

        member_uc = current_member.uc
        if roles.any? { |r| r.start_with?('ZONE_') }
          zone = member_uc.parent
          scope.where(id: [member_uc.id, zone.id] + zone.children.pluck(:id) + [zone.parent_id])
        else
          scope.where(id: [member_uc.id, member_uc.parent_id, member_uc.parent&.parent_id].compact)
        end
      end

      def find_accessible_unit(id)
        Unit.find_by(id: id)
      end

      def unit_json(unit)
        { id: unit.id, name: unit.name, scope_level: unit.scope_level, parent_id: unit.parent_id,
          president: unit.president ? { id: unit.president.id, name: unit.president.name } : nil }
      end

      def unit_detail_json(unit)
        unit_json(unit).merge(created_at: unit.created_at, updated_at: unit.updated_at)
      end
    end
  end
end
