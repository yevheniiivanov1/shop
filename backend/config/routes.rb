Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  get "up" => "rails/health#show", as: :rails_health_check

  # POST /api/auth/sign_in, DELETE /api/auth/sign_out, POST /api/auth/sign_up
  devise_for :users, path: "api/auth", skip: [ :registrations ],
                     controllers: { sessions: "users/sessions" },
                     defaults: { format: :json }
  devise_scope :user do
    post "api/auth/sign_up", to: "users/registrations#create", as: :user_registration, defaults: { format: :json }
  end

  namespace :api, defaults: { format: :json } do
    resource :me, only: :show, controller: "me"
    resource :profile, only: :update

    resources :items, only: [ :index, :show ]
    resources :orders, only: [ :index, :show, :create ]

    namespace :admin do
      resources :users, only: [ :index, :show, :create, :update, :destroy ]
      resources :items, only: [ :create, :update, :destroy ]
    end
  end

  # Everything else is a page of the React client (served in production).
  # Paths with an extension (a missing /assets/*.js) and unknown /api/ paths stay 404.
  constraints(->(request) { request.format.html? }) do
    root "spa#index"
    get "*path", to: "spa#index", format: false,
                 constraints: ->(request) { !request.path.start_with?("/api/") && File.extname(request.path).empty? }
  end
end
