# PATCH /api/profile - a user edits their own personal data.
# Changing email or password requires the current password.
module Api
  class ProfilesController < ApplicationController
    before_action :authenticate_user!

    def update
      user = current_user
      attrs = profile_params
      attrs = attrs.except(:password, :password_confirmation) if attrs[:password].blank?

      sensitive = attrs.key?(:password) || (attrs.key?(:email) && attrs[:email].to_s.strip.casecmp(user.email) != 0)
      if sensitive && !user.valid_password?(params.dig(:user, :current_password).to_s)
        user.assign_attributes(attrs)
        user.errors.add(:current_password, params.dig(:user, :current_password).blank? ? :blank : :invalid)
        return render_errors(user)
      end

      if user.update(attrs)
        # Devise invalidates the session when the password changes; keep the user signed in.
        bypass_sign_in(user) if attrs.key?(:password)
        render json: { user: UserSerializer.call(user) }
      else
        render_errors(user)
      end
    end

    private

    def profile_params
      params.expect(user: [ :first_name, :last_name, :email, :password, :password_confirmation ])
    end
  end
end
