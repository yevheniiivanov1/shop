class CreateOrderDescriptions < ActiveRecord::Migration[8.1]
  def change
    create_table :order_descriptions do |t|
      # Indexed by the unique (order_id, item_id) index below.
      t.references :order, null: false, index: false, foreign_key: { on_delete: :cascade }
      t.references :item, null: false, foreign_key: true
      t.integer :quantity, null: false
      # Unit price at the moment of purchase: later price changes in the catalog
      # must not rewrite the history of already paid orders.
      t.decimal :price, precision: 10, scale: 2, null: false

      t.timestamps
    end

    add_index :order_descriptions, [ :order_id, :item_id ], unique: true
    add_check_constraint :order_descriptions, "quantity > 0", name: "order_descriptions_quantity_check"
    add_check_constraint :order_descriptions, "price >= 0", name: "order_descriptions_price_check"
  end
end
