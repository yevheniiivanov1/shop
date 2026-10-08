require "test_helper"

class ItemTest < ActiveSupport::TestCase
  test "search matches name and description, case-insensitively" do
    assert_equal [ items(:laptop), items(:mouse) ].sort_by(&:id), Item.search("LAPTOP").sort_by(&:id)
    assert_equal [ items(:cable) ], Item.search("usb").to_a
  end

  test "blank search returns everything" do
    assert_equal Item.count, Item.search("  ").count
  end

  test "search treats LIKE wildcards literally" do
    assert_empty Item.search("%")
    assert_empty Item.search("_")
  end

  test "sorting" do
    assert_equal %w[cable mouse laptop].map { items(_1) }, Item.sorted_by("price_asc").to_a
    assert_equal %w[laptop mouse cable].map { items(_1) }, Item.sorted_by("price_desc").to_a
    assert_equal Item.sorted_by("name").to_a, Item.sorted_by("bogus").to_a
  end

  test "price must be present and non-negative" do
    item = Item.new(name: "Item", price: -1)
    assert_not item.valid?
    assert item.errors.of_kind?(:price, :greater_than_or_equal_to)
  end

  test "an ordered item can't be destroyed" do
    assert_not items(:mouse).destroy
    assert items(:laptop).destroy
  end
end
