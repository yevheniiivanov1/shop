class CreateOrders < ActiveRecord::Migration[8.1]
  def change
    create_table :orders do |t|
      t.references :user, null: false, foreign_key: true
      t.decimal :amount, precision: 12, scale: 2, null: false, default: 0

      t.timestamps
    end

    add_check_constraint :orders, "amount >= 0", name: "orders_amount_check"
  end
end
