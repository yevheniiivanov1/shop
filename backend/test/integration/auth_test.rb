require "test_helper"

class AuthTest < ActionDispatch::IntegrationTest
  test "sign up creates a regular user even if a role is passed, and signs them in" do
    assert_difference -> { User.count } do
      post "/api/auth/sign_up", params: { user: {
        first_name: "Peter", last_name: "Parker", email: "peter@example.com",
        password: "secret12", password_confirmation: "secret12", role: "admin"
      } }, as: :json
    end

    assert_response :created
    assert_equal "user", json.dig("user", "role")
    assert User.find_by!(email: "peter@example.com").user?

    get "/api/me", as: :json
    assert_equal "peter@example.com", json.dig("user", "email")
  end

  test "sign up with invalid data returns errors" do
    post "/api/auth/sign_up", params: { user: { email: "nope", password: "1" } }, as: :json

    assert_response :unprocessable_content
    assert json["errors"].any?
  end

  test "sign in, me, sign out" do
    post "/api/auth/sign_in", params: { user: { email: "alice@example.com", password: "password" } }, as: :json
    assert_response :success
    assert_equal "alice@example.com", json.dig("user", "email")
    assert_nil json.dig("user", "encrypted_password")

    delete "/api/auth/sign_out", as: :json
    assert_response :no_content

    get "/api/me", as: :json
    assert_nil json["user"]
  end

  test "wrong password gives 401 with a message" do
    post "/api/auth/sign_in", params: { user: { email: "alice@example.com", password: "wrong" } }, as: :json

    assert_response :unauthorized
    assert json["error"].present?
  end

  test "protected endpoints answer 401 to guests" do
    get "/api/orders", as: :json
    assert_response :unauthorized
  end
end
