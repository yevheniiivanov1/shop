class User < ApplicationRecord
  devise :database_authenticatable, :registerable, :validatable

  enum :role, { user: "user", admin: "admin" }, default: :user, validate: true

  has_many :orders, dependent: :restrict_with_error

  validates :first_name, :last_name, presence: true, length: { maximum: 100 }

  scope :search, ->(query) {
    next all if query.blank?

    pattern = "%#{sanitize_sql_like(query.strip)}%"
    where("users.first_name ILIKE :p OR users.last_name ILIKE :p OR users.email ILIKE :p", p: pattern)
  }
end
