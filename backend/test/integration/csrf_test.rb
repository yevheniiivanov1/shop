require "test_helper"

# Forgery protection is off in the test env; this test turns it on to check
# the cookie-to-header handshake the React client relies on.
class CsrfTest < ActionDispatch::IntegrationTest
  setup do
    @was = ApplicationController.allow_forgery_protection
    ApplicationController.allow_forgery_protection = true
  end

  teardown do
    ApplicationController.allow_forgery_protection = @was
  end

  test "state-changing requests need the token from the CSRF-TOKEN cookie" do
    credentials = { user: { email: "alice@example.com", password: "password" } }

    post "/api/auth/sign_in", params: credentials, as: :json
    assert_response :unprocessable_content
    assert_equal "invalid_csrf_token", json["code"]

    get "/api/me", as: :json
    token = cookies["CSRF-TOKEN"]
    assert token.present?

    post "/api/auth/sign_in", params: credentials, headers: { "X-CSRF-Token" => CGI.unescape(token) }, as: :json
    assert_response :success
  end
end
