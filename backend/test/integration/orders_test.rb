require "test_helper"

class OrdersTest < ActionDispatch::IntegrationTest
  setup { sign_in users(:alice) }

  test "paying for a cart creates an order for the current user" do
    assert_difference -> { users(:alice).orders.count } do
      post "/api/orders", params: { items: [
        { item_id: items(:laptop).id, quantity: 1 },
        { item_id: items(:cable).id, quantity: 3 }
      ] }, as: :json
    end

    assert_response :created
    assert_equal "926.00", json.dig("order", "amount")
    assert_equal [ [ "Lenovo IdeaPad 5 Laptop", 1, "899.00" ], [ "USB-C Cable", 3, "27.00" ] ],
                 json.dig("order", "lines").map { _1.values_at("name", "quantity", "subtotal") }
  end

  test "client-side prices are ignored" do
    post "/api/orders", params: { items: [ { item_id: items(:laptop).id, quantity: 1, price: "1.00" } ] }, as: :json

    assert_equal "899.00", json.dig("order", "amount")
  end

  test "invalid cart is rejected" do
    post "/api/orders", params: { items: [ { item_id: items(:laptop).id, quantity: 0 } ] }, as: :json

    assert_response :unprocessable_content
    assert json["error"].present?
  end

  test "lists and shows only own orders" do
    get "/api/orders", as: :json
    assert_response :success
    assert_empty json["orders"]

    sign_in users(:bob)
    get "/api/orders", as: :json
    assert_equal [ orders(:bobs_order).id ], json["orders"].map { _1["id"] }
    assert_equal 3, json["orders"].first["items_count"]

    get "/api/orders/#{orders(:bobs_order).id}", as: :json
    assert_response :success
    assert_equal 2, json.dig("order", "lines").size
  end

  test "someone else's order is not found" do
    get "/api/orders/#{orders(:bobs_order).id}", as: :json
    assert_response :not_found
  end
end
