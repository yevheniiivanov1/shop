# One line of an order ("Orders_description" in the spec): which item, how many, at what price.
class OrderDescription < ApplicationRecord
  MAX_QUANTITY = 1000

  belongs_to :order, inverse_of: :order_descriptions
  belongs_to :item

  validates :quantity, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: MAX_QUANTITY }
  validates :price, numericality: { greater_than_or_equal_to: 0 }

  def subtotal
    price * quantity
  end
end
