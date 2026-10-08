# Demo data. Safe to run on every start (bin/docker-entrypoint does), and it
# restores the demo if visitors changed it: demo accounts get their names back
# and demo items their name, description and price. Other data is left alone.
#
#   admin@example.com / password  - admin
#   user@example.com  / password  - regular user

demo_password = ENV.fetch("DEMO_PASSWORD", "password")

demo_users = [
  { email: "admin@example.com", first_name: "Anna", last_name: "Admin", role: "admin" },
  { email: "user@example.com", first_name: "John", last_name: "Smith", role: "user" }
].map do |attributes|
  user = User.find_or_initialize_by(email: attributes[:email])
  user.assign_attributes(attributes)
  user.password = demo_password unless user.persisted? && user.valid_password?(demo_password)
  # The demo-account lock (an :update validation) doesn't apply to restoring them.
  user.save!(context: :restore_demo)
  user
end
admin, user = demo_users

[
  [ "Lenovo IdeaPad 5 Laptop", "14\", Ryzen 7, 16 GB RAM, 512 GB SSD. Lightweight aluminum body.", 849 ],
  [ "Apple MacBook Air 13 M3", "8-core M3 chip, 16 GB RAM, 256 GB SSD, Midnight.", 1_099 ],
  [ "Samsung Galaxy A55 Smartphone", "6.6\" Super AMOLED, 8/256 GB, triple 50 MP camera.", 449 ],
  [ "Google Pixel 8a Smartphone", "6.1\" 120 Hz OLED, Tensor G3, 8/128 GB.", 499 ],
  [ "Sony WH-1000XM5 Headphones", "Wireless, active noise cancelling, up to 30 hours of playback.", 399 ],
  [ "Apple AirPods Pro 2 Earbuds", "True wireless, USB-C case, adaptive noise cancelling.", 249 ],
  [ "Dell P2723DE Monitor", "27\" IPS, QHD, USB-C hub with 90 W charging.", 399 ],
  [ "LG UltraGear 27GP850 Monitor", "27\" Nano IPS, 165 Hz, 1 ms. Built for gaming.", 349 ],
  [ "Logitech MX Keys S Keyboard", "Wireless, backlit, pairs with up to 3 devices.", 119 ],
  [ "Logitech MX Master 3S Mouse", "Quiet clicks, 8000 DPI sensor, USB-C charging.", 99 ],
  [ "Logitech C920 Webcam", "Full HD 1080p, stereo microphones.", 69 ],
  [ "Samsung T7 1 TB Portable SSD", "USB 3.2 Gen 2, up to 1050 MB/s, shock-resistant body.", 109 ],
  [ "Kingston DataTraveler 128 GB Flash Drive", "USB 3.2, metal casing.", 12 ],
  [ "TP-Link Archer AX55 Router", "Wi-Fi 6, AX3000, four gigabit LAN ports.", 89 ],
  [ "Xiaomi 20000 mAh Power Bank", "22.5 W fast charging, two USB-A ports and one USB-C.", 35 ],
  [ "Anker 65 W Charger", "GaN, 2x USB-C + USB-A, compact.", 45 ],
  [ "USB-C to USB-C Cable, 2 m", "Braided, 100 W, 480 Mbps data transfer.", 9 ],
  [ "Garmin Forerunner 265 Smartwatch", "AMOLED, GPS, heart rate monitor, up to 13 days of battery life.", 449 ],
  [ "Xiaomi Smart Band 9 Fitness Tracker", "1.62\" AMOLED, SpO2, 150+ workout modes.", 45 ],
  [ "PocketBook 634 Verse Pro E-reader", "6\" E Ink Carta 1200, front light, IPX8 water protection.", 169 ],
  [ "Samsung Galaxy Tab S9 FE Tablet", "10.9\", 6/128 GB, S Pen included.", 399 ],
  [ "JBL Flip 6 Speaker", "Portable, IP67 waterproof, up to 12 hours of playback.", 129 ],
  [ "De'Longhi Magnifica S Coffee Machine", "Fully automatic, built-in grinder, milk frother.", 399 ],
  [ "Philips HD9365 Electric Kettle", "1.7 L, stainless steel, 2200 W.", 39 ],
  [ "Roborock Q7 Max Robot Vacuum", "Vacuums and mops, LiDAR navigation, app control.", 349 ],
  [ "Dyson V12 Detect Slim Vacuum", "Cordless, laser dust detection.", 649 ],
  [ "Xiaomi Business Laptop Backpack", "Fits laptops up to 15.6\", water-repellent fabric.", 39 ],
  [ "Xiaomi Mi LED Desk Lamp 1S", "Adjustable brightness and color temperature, smart home ready.", 49 ],
  [ "Sony PlayStation 5 Slim Console", "1 TB SSD, DualSense controller.", 499 ],
  [ "Xbox Wireless Controller", "Bluetooth, works with Xbox, PC and phones.", 59 ]
].each do |name, description, price|
  Item.find_or_initialize_by(name:).update!(description:, price:)
end

# A couple of past orders so "My orders" isn't empty in the demo.
if user.orders.none?
  [
    [ [ "Logitech MX Master 3S Mouse", 1 ], [ "USB-C to USB-C Cable, 2 m", 2 ] ],
    [ [ "Sony WH-1000XM5 Headphones", 1 ], [ "Xiaomi 20000 mAh Power Bank", 1 ], [ "Kingston DataTraveler 128 GB Flash Drive", 3 ] ]
  ].each do |lines|
    items = Item.where(name: lines.map(&:first)).index_by(&:name)
    next unless items.size == lines.size

    Checkout.call(user:, lines: lines.map { |name, quantity| { item_id: items[name].id, quantity: } })
  end
end

puts "Seeded: #{User.count} users (admin: #{admin.email}), #{Item.count} items, #{Order.count} orders"
