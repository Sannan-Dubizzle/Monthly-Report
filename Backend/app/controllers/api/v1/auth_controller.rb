module Api
  module V1
    class AuthController < ApplicationController
      skip_before_action :authenticate!, only: [:login, :refresh]

      def login
        result = AuthService.login(email: params[:email], password: params[:password])
        if result
          render json: {
            access_token: result[:access_token],
            refresh_token: result[:refresh_token],
            expires_in: result[:expires_in],
            member: member_payload(result[:member])
          }
        else
          render json: { error: 'invalid_credentials', message: 'Email or password is incorrect.' }, status: :unauthorized
        end
      end

      def refresh
        result = AuthService.refresh(params[:refresh_token])
        if result
          render json: result
        else
          render json: { error: 'invalid_refresh_token', message: 'Refresh token is invalid or expired.' }, status: :unauthorized
        end
      end

      def logout
        AuthService.logout(params[:refresh_token])
        render json: { message: 'Logged out successfully.' }
      end

      private

      def member_payload(member)
        active_roles = member.member_roles.where(revoked_at: nil).includes(:role).map { |mr| mr.role.name }
        perms = member.permissions.pluck(:name)
        {
          id: member.id,
          name: member.name,
          email: member.email,
          uc_id: member.uc_id,
          roles: active_roles,
          permissions: perms
        }
      end
    end
  end
end
