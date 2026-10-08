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

  test "arrays, hashes and junk in query params fall back to defaults" do
    [
      "q[]=x", "q[a]=b", "sort[]=name", "page[]=1", "page[a]=1", "per_page[]=1",
      "page=abc", "page=-5", "page=#{"9" * 40}", "per_page=0", "per_page=100000"
    ].each do |query|
      get "/api/items?#{query}", headers: { "Accept" => "application/json" }

      assert_response :success, "GET /api/items?#{query}"
      assert_equal Item.count, json.dig("meta", "total"), "GET /api/items?#{query}"
    end

    get "/api/items?per_page=0"
    assert_equal 1, json.dig("meta", "per_page")
    get "/api/items?per_page=100000"
    assert_equal 100, json.dig("meta", "per_page")
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
