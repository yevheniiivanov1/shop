class User < ApplicationRecord
  # The demo accounts' credentials are published (README, sign-in page), so no
  # visitor may lock others out of them: their email, password and role are
  # fixed and they can't be deleted. db/seeds.rb restores everything else.
  DEMO_EMAILS = %w[admin@example.com user@example.com].freeze

  devise :database_authenticatable, :registerable, :validatable

  enum :role, { user: "user", admin: "admin" }, default: :user, validate: true

  before_destroy :keep_demo_account, prepend: true
  has_many :orders, dependent: :restrict_with_error

  validates :first_name, :last_name, presence: true, length: { maximum: 100 }
  # Skipped when seeds restore the demo: they save with context :restore_demo.
  validate :demo_credentials_unchanged, on: :update

  scope :search, ->(query) {
    next all if query.blank?

    pattern = "%#{sanitize_sql_like(query.strip)}%"
    where("users.first_name ILIKE :p OR users.last_name ILIKE :p OR users.email ILIKE :p", p: pattern)
  }

  def demo?
    DEMO_EMAILS.include?(email_in_database)
  end

  private

  def demo_credentials_unchanged
    return unless demo?
    return unless will_save_change_to_email? || will_save_change_to_encrypted_password? || will_save_change_to_role?

    errors.add(:base, :demo_account_locked)
  end

  def keep_demo_account
    return unless demo?

    errors.add(:base, :demo_account_locked)
    throw :abort
  end
end
