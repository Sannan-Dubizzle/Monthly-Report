Rails.application.routes.draw do
  # Health check
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      # Auth
      post 'auth/login',   to: 'auth#login'
      post 'auth/refresh', to: 'auth#refresh'
      post 'auth/logout',  to: 'auth#logout'

      # Units
      resources :units, only: [:index, :show, :create, :update]

      # Members
      resources :members, only: [:index, :show, :create] do
        member do
          post 'roles', to: 'members#assign_role'
          delete 'roles/:role_name', to: 'members#revoke_role', constraints: { role_name: /[^\/]+/ }
        end
      end

      # Reports
      resources :reports, only: [:index, :show, :create, :update] do
        collection do
          get 'new', to: 'reports#form_schema'
          get 'export', to: 'reports#export'
        end
        member do
          post 'lock-zone', to: 'reports#lock_zone'
          post 'finalize',  to: 'reports#finalize'
        end
      end

      # Activities
      resources :activities, only: [:index, :create]

      # Audit logs
      get 'audit-logs', to: 'audit_logs#index'
    end
  end
end
