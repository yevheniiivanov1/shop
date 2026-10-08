# "Pays" for a cart: creates an Order and its OrderDescription lines in one
# transaction. Prices are always taken from the database, never from the client.
#
#   result = Checkout.call(user: current_user, lines: [{ item_id: 1, quantity: 2 }])
#   result.success? # => true
#   result.order    # => #<Order amount: ...>
class Checkout
  MAX_LINES = 100

  Result = Data.define(:order, :errors) do
    def success? = errors.empty?
  end

  def self.call(...) = new(...).call

  def initialize(user:, lines:)
    @user = user
    @lines = Array(lines)
  end

  def call
    quantities = normalize_lines
    return failure(@errors) if @errors.any?

    items = Item.where(id: quantities.keys).index_by(&:id)
    missing = quantities.keys - items.keys
    return failure([ I18n.t("checkout.errors.items_not_found", ids: missing.join(", ")) ]) if missing.any?

    order = @user.orders.build
    quantities.each do |item_id, quantity|
      item = items.fetch(item_id)
      order.order_descriptions.build(item:, quantity:, price: item.price)
    end
    order.amount = order.order_descriptions.sum(&:subtotal)

    order.save ? Result.new(order:, errors: []) : failure(order.errors.full_messages)
  end

  private

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

  def add_error(key, **options)
    @errors << I18n.t(key, **options)
  end

  def failure(errors)
    Result.new(order: nil, errors:)
  end
end
