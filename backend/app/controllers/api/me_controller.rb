# GET /api/me - who is signed in (user: null for guests).
# Public on purpose: the client calls it on startup, which also hands out the CSRF cookie.
module Api
  class MeController < ApplicationController
    def show
      render json: { user: current_user && UserSerializer.call(current_user) }
    end
  end
end
