require "test_helper"

class CheckoutTest < ActiveSupport::TestCase
  setup do
    @user = users(:alice)
    @laptop = items(:laptop)
    @mouse = items(:mouse)
  end

  test "creates an order with lines and the total amount from database prices" do
    result = nil
    assert_difference -> { Order.count } => 1, -> { OrderDescription.count } => 2 do
      result = Checkout.call(user: @user, lines: [
        { item_id: @laptop.id, quantity: 1 },
        { item_id: @mouse.id.to_s, quantity: "2" }
      ])
    end

    assert result.success?
    order = result.order
    assert_equal @user, order.user
    assert_equal BigDecimal("1098.00"), order.amount
    assert_equal [ [ @laptop.id, 1, @laptop.price ], [ @mouse.id, 2, @mouse.price ] ],
                 order.order_descriptions.map { [ _1.item_id, _1.quantity, _1.price ] }
  end

  test "merges duplicate items into one line" do
    result = Checkout.call(user: @user, lines: [ { item_id: @mouse.id, quantity: 1 }, { item_id: @mouse.id, quantity: 2 } ])

    assert result.success?
    assert_equal [ 3 ], result.order.order_descriptions.map(&:quantity)
  end

  test "keeps the purchase price when the catalog price changes later" do
    order = Checkout.call(user: @user, lines: [ { item_id: @mouse.id, quantity: 1 } ]).order
    @mouse.update!(price: 1)

    assert_equal BigDecimal("99.50"), order.reload.order_descriptions.first.price
  end

  test "rejects an empty cart" do
    result = Checkout.call(user: @user, lines: [])

    assert_not result.success?
    assert_equal [ "Your cart is empty" ], result.errors
  end

  test "rejects invalid quantities without creating anything" do
    [ 0, -1, "abc", nil, 1.5 ].each do |quantity|
      assert_no_difference -> { Order.count } do
        result = Checkout.call(user: @user, lines: [ { item_id: @laptop.id, quantity: } ])
        assert_not result.success?, "quantity #{quantity.inspect} must be rejected"
      end
    end
  end

  test "rejects unknown items and says which ones" do
    result = Checkout.call(user: @user, lines: [ { item_id: @laptop.id, quantity: 1 }, { item_id: 0, quantity: 1 } ])

    assert_not result.success?
    assert_equal :items_not_found, result.code
    assert_equal [ 0 ], result.missing_item_ids
    assert_equal "An item in your cart is no longer available", result.errors.first
    assert_equal 1, Order.count # only the fixture order
  end

  test "charges only the total the customer saw" do
    lines = [ { item_id: @mouse.id, quantity: 2 } ]

    assert Checkout.call(user: @user, lines:, expected_amount: "199.00").success?
    assert Checkout.call(user: @user, lines:, expected_amount: 199).success?

    result = nil
    assert_no_difference -> { Order.count } do
      result = Checkout.call(user: @user, lines:, expected_amount: "198.00")
    end
    assert_equal :prices_changed, result.code
  end

  test "ignores an expected amount that isn't a number" do
    assert Checkout.call(user: @user, lines: [ { item_id: @mouse.id, quantity: 1 } ], expected_amount: [ "1" ]).success?
  end

  test "an item deleted while the order is being placed is reported, not raised" do
    checkout = Checkout.new(user: @user, lines: [ { item_id: @laptop.id, quantity: 1 } ])
    # Deletes the item right after Checkout has read it.
    def checkout.load_items(ids) = super.tap { Item.where(id: ids).delete_all }

    result = checkout.call

    assert_equal :items_not_found, result.code
    assert_equal [ @laptop.id ], result.missing_item_ids
  end

  test "a total too large for the amount column is a validation error" do
    yacht = Item.create!(name: "Yacht", price: 99_999_999)

    result = Checkout.call(user: @user, lines: [ { item_id: yacht.id, quantity: 1000 } ])

    assert_not result.success?
    assert_equal "Amount is too large for a single order", result.errors.first
  end

  test "rejects too large quantities" do
    result = Checkout.call(user: @user, lines: [ { item_id: @laptop.id, quantity: OrderDescription::MAX_QUANTITY + 1 } ])

    assert_not result.success?
  end
end
