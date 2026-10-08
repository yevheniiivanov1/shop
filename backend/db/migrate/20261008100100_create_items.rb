class CreateItems < ActiveRecord::Migration[8.1]
  def change
    # Trigram indexes keep the catalog's substring search (ILIKE '%term%') fast.
    enable_extension "pg_trgm"

    create_table :items do |t|
      t.string :name, null: false
      t.text :description
      t.decimal :price, precision: 10, scale: 2, null: false

      t.timestamps
    end

    add_index :items, :name, using: :gin, opclass: :gin_trgm_ops
    add_index :items, :description, using: :gin, opclass: :gin_trgm_ops
    add_check_constraint :items, "price >= 0", name: "items_price_check"
  end
end
