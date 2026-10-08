require "test_helper"

class ProfileTest < ActionDispatch::IntegrationTest
  setup do
    @alice = users(:alice)
    sign_in @alice
  end

  test "updates names without a password" do
    patch "/api/profile", params: { user: { first_name: "Alice-Mary", last_name: "Newman" } }, as: :json

    assert_response :success
    assert_equal "Alice-Mary", @alice.reload.first_name
  end

  test "the role can't be changed from the profile" do
    patch "/api/profile", params: { user: { first_name: "Alice", role: "admin" } }, as: :json

    assert_response :success
    assert @alice.reload.user?
  end

  test "changing email requires the current password" do
    patch "/api/profile", params: { user: { email: "new@example.com" } }, as: :json
    assert_response :unprocessable_content
    assert_equal "alice@example.com", @alice.reload.email

    patch "/api/profile", params: { user: { email: "new@example.com", current_password: "password" } }, as: :json
    assert_response :success
    assert_equal "new@example.com", @alice.reload.email
  end

  test "a demo account can't change its password" do
    demo = users(:demo_admin)
    sign_in demo
    patch "/api/profile", params: { user: {
      password: "newpass1", password_confirmation: "newpass1", current_password: "password"
    } }, as: :json

    assert_response :unprocessable_content
    assert demo.reload.valid_password?("password")
  end

  test "changing password keeps the user signed in" do
    patch "/api/profile", params: { user: {
      password: "newpass1", password_confirmation: "newpass1", current_password: "password"
    } }, as: :json

    assert_response :success
    assert @alice.reload.valid_password?("newpass1")

    get "/api/me", as: :json
    assert_equal @alice.email, json.dig("user", "email")
  end
end
