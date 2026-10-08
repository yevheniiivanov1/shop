module OrderSerializer
  # Summary for the orders list. Expects order_descriptions to be preloaded.
  def self.call(order)
    {
      id: order.id,
      amount: Money.format(order.amount),
      items_count: order.order_descriptions.sum(&:quantity),
      created_at: order.created_at
    }
  end

  # Full order with its lines. Expects order_descriptions: :item to be preloaded.
  def self.detailed(order)
    call(order).merge(
      lines: order.order_descriptions.map do |line|
        {
          id: line.id,
          item_id: line.item_id,
          name: line.item.name,
          price: Money.format(line.price),
          quantity: line.quantity,
          subtotal: Money.format(line.subtotal)
        }
      end
    )
  end
end
