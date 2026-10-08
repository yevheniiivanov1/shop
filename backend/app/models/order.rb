class Order < ApplicationRecord
  # The largest value orders.amount (numeric(12, 2)) can hold.
  MAX_AMOUNT = BigDecimal("9999999999.99")

  belongs_to :user
  has_many :order_descriptions, -> { order(:id) }, dependent: :destroy, inverse_of: :order
  has_many :items, through: :order_descriptions

  validates :amount, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: MAX_AMOUNT }
  validates :order_descriptions, presence: true
end
