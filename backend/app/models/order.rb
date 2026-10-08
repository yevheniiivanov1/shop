class Order < ApplicationRecord
  belongs_to :user
  has_many :order_descriptions, -> { order(:id) }, dependent: :destroy, inverse_of: :order
  has_many :items, through: :order_descriptions

  validates :amount, numericality: { greater_than_or_equal_to: 0 }
  validates :order_descriptions, presence: true
end
