require "test_helper"

class UserTest < ActiveSupport::TestCase
  setup { @demo = users(:demo_admin) }

  test "demo accounts keep their email, password and role" do
    assert_not @demo.update(email: "mine@example.com")
    assert_not @demo.reload.update(password: "newpass1", password_confirmation: "newpass1")
    assert_not @demo.reload.update(role: "user")

    @demo.reload
    assert_equal "admin@example.com", @demo.email
    assert @demo.valid_password?("password")
    assert @demo.admin?
  end

  test "demo accounts' names can still be edited" do
    assert @demo.update(first_name: "Annie")
  end

  test "demo accounts can't be deleted" do
    assert_not @demo.destroy
    assert_match "demo account", @demo.errors.full_messages.first
    assert User.exists?(@demo.id)
  end

  test "other accounts are not locked" do
    assert users(:alice).update(email: "alice2@example.com", role: "admin")
  end

  test "seeds restore the demo" do
    @demo.update_columns(first_name: "Hacked", encrypted_password: Devise::Encryptor.digest(User, "stolen"))
    capture_io { Rails.application.load_seed }
    laptop = Item.find_by!(name: "Lenovo IdeaPad 5 Laptop")
    laptop.update_columns(price: 1, description: "Defaced")
    laptop_count = Item.where(name: laptop.name).count

    capture_io { Rails.application.load_seed }

    @demo.reload
    assert_equal "Anna", @demo.first_name
    assert @demo.valid_password?("password")
    assert_equal BigDecimal("849"), laptop.reload.price
    assert_equal laptop_count, Item.where(name: laptop.name).count, "items must not be duplicated"
    assert User.find_by!(email: "user@example.com").orders.any?
  end
end
