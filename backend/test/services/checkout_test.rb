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

  test "rejects unknown items" do
    result = Checkout.call(user: @user, lines: [ { item_id: @laptop.id, quantity: 1 }, { item_id: 0, quantity: 1 } ])

    assert_not result.success?
    assert_match "0", result.errors.first
    assert_equal 1, Order.count # only the fixture order
  end

  test "rejects too large quantities" do
    result = Checkout.call(user: @user, lines: [ { item_id: @laptop.id, quantity: OrderDescription::MAX_QUANTITY + 1 } ])

    assert_not result.success?
  end
end
