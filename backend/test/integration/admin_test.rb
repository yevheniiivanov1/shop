require "test_helper"

class AdminTest < ActionDispatch::IntegrationTest
  test "regular users can't use admin endpoints" do
    sign_in users(:alice)

    get "/api/admin/users", as: :json
    assert_response :forbidden

    patch "/api/admin/items/#{items(:laptop).id}", params: { item: { price: 1 } }, as: :json
    assert_response :forbidden
    assert_equal BigDecimal("899"), items(:laptop).reload.price
  end

  test "guests get 401" do
    get "/api/admin/users", as: :json
    assert_response :unauthorized
  end

  class AsAdmin < ActionDispatch::IntegrationTest
    setup { sign_in users(:admin) }

    test "lists and searches users" do
      get "/api/admin/users", params: { q: "ALICE" }

      assert_response :success
      assert_equal [ "alice@example.com" ], json["users"].map { _1["email"] }
      assert_equal 1, json.dig("meta", "total")
    end

    test "edits a user, including the role and password" do
      alice = users(:alice)
      patch "/api/admin/users/#{alice.id}", params: { user: { last_name: "Smith", role: "admin", password: "" } }, as: :json

      assert_response :success
      alice.reload
      assert_equal "Smith", alice.last_name
      assert alice.admin?
      assert alice.valid_password?("password"), "blank password must not be changed"
    end

    test "rejects unknown roles" do
      patch "/api/admin/users/#{users(:alice).id}", params: { user: { role: "root" } }, as: :json
      assert_response :unprocessable_content
    end

    test "can't demote or delete themselves" do
      patch "/api/admin/users/#{users(:admin).id}", params: { user: { role: "user" } }, as: :json
      assert_response :unprocessable_content

      delete "/api/admin/users/#{users(:admin).id}", as: :json
      assert_response :unprocessable_content
      assert users(:admin).reload.admin?
    end

    test "can't delete a user with orders, can delete one without" do
      delete "/api/admin/users/#{users(:bob).id}", as: :json
      assert_response :unprocessable_content

      delete "/api/admin/users/#{users(:alice).id}", as: :json
      assert_response :no_content
    end

    test "creates, updates and deletes items" do
      post "/api/admin/items", params: { item: { name: "New item", description: "Description", price: "10.5" } }, as: :json
      assert_response :created
      id = json.dig("item", "id")
      assert_equal "10.50", json.dig("item", "price")

      patch "/api/admin/items/#{id}", params: { item: { price: "12" } }, as: :json
      assert_response :success
      assert_equal "12.00", json.dig("item", "price")

      delete "/api/admin/items/#{id}", as: :json
      assert_response :no_content
      assert_not Item.exists?(id)
    end

    test "validates items" do
      post "/api/admin/items", params: { item: { name: "", price: "-5" } }, as: :json
      assert_response :unprocessable_content
      assert_equal 2, json["errors"].size
    end

    test "can't change the demo accounts' credentials or delete them" do
      demo = users(:demo_admin)

      patch "/api/admin/users/#{demo.id}", params: { user: { role: "user", password: "newpass1" } }, as: :json
      assert_response :unprocessable_content
      assert_match "demo account", json["error"]

      delete "/api/admin/users/#{demo.id}", as: :json
      assert_response :unprocessable_content
      assert demo.reload.admin?
    end

    test "can't delete an item that was ordered" do
      delete "/api/admin/items/#{items(:mouse).id}", as: :json
      assert_response :unprocessable_content
      assert Item.exists?(items(:mouse).id)
    end
  end
end
