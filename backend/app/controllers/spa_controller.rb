# In production the built React client is served by Rails from the same origin
# (see the root Dockerfile). Every non-API HTML request gets index.html and
# React Router takes over. In development the client runs on the Vite dev server.
class SpaController < ApplicationController
  INDEX = Rails.root.join("spa", "index.html")

  def index
    if INDEX.exist?
      response.headers["Cache-Control"] = "no-cache"
      send_file INDEX, type: "text/html", disposition: "inline"
    else
      render plain: "Frontend is not built. In development open the Vite dev server: http://localhost:5173", status: :not_found
    end
  end
end
