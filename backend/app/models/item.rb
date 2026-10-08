class Item < ApplicationRecord
  SORTS = {
    "name" => { name: :asc, id: :asc },
    "price_asc" => { price: :asc, id: :asc },
    "price_desc" => { price: :desc, id: :asc },
    "newest" => { created_at: :desc, id: :desc }
  }.freeze

  # Items that were already ordered can't be deleted: order history must stay intact.
  has_many :order_descriptions, dependent: :restrict_with_error

  validates :name, presence: true, length: { maximum: 255 }
  validates :description, length: { maximum: 5000 }
  validates :price, presence: true, numericality: { greater_than_or_equal_to: 0, less_than: 100_000_000 }

  scope :search, ->(query) {
    next all if query.blank?

    pattern = "%#{sanitize_sql_like(query.strip)}%"
    where("items.name ILIKE :p OR items.description ILIKE :p", p: pattern)
  }

  scope :sorted_by, ->(key) { order(SORTS.fetch(key.to_s, SORTS["name"])) }
end
