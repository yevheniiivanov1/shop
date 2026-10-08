# "Pays" for a cart: creates an Order and its OrderDescription lines in one
# transaction. Prices are always taken from the database, never from the client.
#
#   result = Checkout.call(user: current_user, lines: [{ item_id: 1, quantity: 2 }], expected_amount: "198.00")
#   result.success? # => true
#   result.order    # => #<Order amount: ...>
#
# `expected_amount` is the total the customer saw. When given and the current
# prices add up to something else, nothing is charged and the result's code is
# :prices_changed, so the client can show the new prices first.
class Checkout
  MAX_LINES = 100

  # code: nil on success or invalid input, :items_not_found or :prices_changed otherwise.
  Result = Data.define(:order, :errors, :code, :missing_item_ids) do
    def success? = errors.empty?
  end

  def self.call(...) = new(...).call

  def initialize(user:, lines:, expected_amount: nil)
    @user = user
    @lines = Array(lines)
    @expected_amount = parse_amount(expected_amount)
  end

  def call
    quantities = normalize_lines
    return failure(@errors) if @errors.any?

    items = load_items(quantities.keys)
    missing = quantities.keys - items.keys
    return items_not_found(missing) if missing.any?

    order = build_order(quantities, items)
    if @expected_amount && order.amount != @expected_amount
      return failure([ I18n.t("checkout.errors.prices_changed") ], code: :prices_changed)
    end

    order.save ? Result.new(order:, errors: [], code: nil, missing_item_ids: []) : failure(order.errors.full_messages)
  rescue ActiveRecord::InvalidForeignKey
    # An item was deleted between reading it above and saving the order.
    items_not_found(quantities.keys - Item.where(id: quantities.keys).pluck(:id))
  end

  private

  def load_items(ids)
    Item.where(id: ids).index_by(&:id)
  end

  def build_order(quantities, items)
    order = @user.orders.build
    quantities.each do |item_id, quantity|
      item = items.fetch(item_id)
      order.order_descriptions.build(item:, quantity:, price: item.price)
    end
    order.amount = order.order_descriptions.sum(&:subtotal)
    order
  end

  # Validates the raw input and merges duplicate items: { item_id => quantity }.
  def normalize_lines
    @errors = []
    quantities = Hash.new(0)

    if @lines.empty?
      add_error("checkout.errors.empty")
    elsif @lines.size > MAX_LINES
      add_error("checkout.errors.too_many_lines", max: MAX_LINES)
    else
      @lines.each do |line|
        line = line.respond_to?(:to_h) ? line.to_h.symbolize_keys : {}
        item_id = to_integer(line[:item_id])
        quantity = to_integer(line[:quantity])

        if item_id.nil? || quantity.nil? || quantity <= 0
          add_error("checkout.errors.invalid_line")
        else
          quantities[item_id] += quantity
        end
      end
    end

    if quantities.values.any? { _1 > OrderDescription::MAX_QUANTITY }
      add_error("checkout.errors.quantity_too_large", max: OrderDescription::MAX_QUANTITY)
    end
    @errors.uniq!
    quantities
  end

  # Strict: "2" and 2 are fine, 1.5 / "1.5" / "abc" are not (Integer(1.5) would truncate).
  def to_integer(value)
    value.is_a?(Integer) ? value : Integer(value.to_s, 10, exception: false)
  end

  def parse_amount(value)
    BigDecimal(value.to_s, exception: false) if value.is_a?(String) || value.is_a?(Numeric)
  end

  def add_error(key, **options)
    @errors << I18n.t(key, **options)
  end

  def items_not_found(ids)
    failure([ I18n.t("checkout.errors.items_not_found", count: ids.size) ], code: :items_not_found, missing_item_ids: ids)
  end

  def failure(errors, code: nil, missing_item_ids: [])
    Result.new(order: nil, errors:, code:, missing_item_ids:)
  end
end
