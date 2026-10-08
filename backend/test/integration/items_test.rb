require "test_helper"

class ItemsTest < ActionDispatch::IntegrationTest
  test "the catalog is public, searchable and paginated" do
    get "/api/items", params: { q: "laptop", sort: "price_desc", per_page: 1 }

    assert_response :success
    assert_equal [ "Lenovo IdeaPad 5 Laptop" ], json["items"].map { _1["name"] }
    assert_equal({ "page" => 1, "per_page" => 1, "total" => 2, "total_pages" => 2 }, json["meta"])

    get "/api/items", params: { q: "laptop", sort: "price_desc", per_page: 1, page: 2 }
    assert_equal [ "Logitech MX Master 3S Mouse" ], json["items"].map { _1["name"] }
  end

  test "shows an item" do
    get "/api/items/#{items(:mouse).id}", as: :json

    assert_response :success
    assert_equal "99.50", json.dig("item", "price")
  end

  test "unknown item is 404" do
    get "/api/items/0", as: :json
    assert_response :not_found
  end
end
