# POST   /api/auth/sign_in   { user: { email, password } }
# DELETE /api/auth/sign_out
module Users
  class SessionsController < Devise::SessionsController
    respond_to :json

    private

    def respond_with(resource, _options = {})
      render json: { user: UserSerializer.call(resource) }
    end

    # Devise's version uses `respond_to`, which API-only controllers don't have.
    # 204 after sign-out, 401 if nobody was signed in.
    def respond_to_on_destroy(non_navigational_status: :no_content)
      head non_navigational_status
    end
  end
end
