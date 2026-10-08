# POST /api/auth/sign_up  { user: { first_name, last_name, email, password, password_confirmation } }
#
# Only sign-up goes through Devise; profile editing lives in Api::ProfilesController.
# The role is never accepted from the client: everyone signs up as a regular user.
module Users
  class RegistrationsController < Devise::RegistrationsController
    respond_to :json

    private

    def sign_up_params
      params.expect(user: [ :first_name, :last_name, :email, :password, :password_confirmation ])
    end

    def respond_with(resource, _options = {})
      if resource.persisted?
        render json: { user: UserSerializer.call(resource) }, status: :created
      else
        render_errors(resource)
      end
    end
  end
end
