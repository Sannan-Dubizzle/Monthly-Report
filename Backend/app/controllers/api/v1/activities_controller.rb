module Api
  module V1
    class ActivitiesController < ApplicationController
      def index
        require_permission!('activities:list') and return unless performed?
        scope = ActivityDefinition.all
        scope = scope.where(scope_level: params[:scope_level]) if params[:scope_level]
        scope = scope.where(is_active: params[:is_active]) if params[:is_active]
        render json: { data: scope.map { |a| activity_json(a) } }
      end

      def create
        require_permission!('activities:create') and return unless performed?
        ad = ActivityDefinition.new(activity_params)
        if ad.save
          render json: activity_json(ad), status: :created
        else
          render json: { errors: ad.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def activity_params
        params.permit(:name, :scope_level, :compulsory_per_month)
      end

      def activity_json(a)
        { id: a.id, name: a.name, scope_level: a.scope_level, compulsory_per_month: a.compulsory_per_month, is_active: a.is_active, created_at: a.created_at }
      end
    end
  end
end
