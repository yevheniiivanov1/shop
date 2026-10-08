require "test_helper"
require "open3"

# Rails 8 loads routes lazily when eager_load is off (development, test), and
# Devise configures Warden's strategies only while routes load. Each request's
# Warden proxy copies that config before the router runs, so unless routes are
# loaded at boot (config/initializers/devise.rb), the first request of a fresh
# process can't sign anyone in. This runs that first request in a new process.
class BootTest < ActiveSupport::TestCase
  test "the first request after boot can sign in" do
    script = <<~RUBY
      env = Rack::MockRequest.env_for("/api/auth/sign_in", method: "POST",
        input: { user: { email: "nobody@example.com", password: "wrong" } }.to_json,
        "CONTENT_TYPE" => "application/json", "HTTP_ACCEPT" => "application/json")
      _status, _headers, body = Rails.application.call(env)
      body.each { |part| print part }
    RUBY

    output, status = Open3.capture2e({ "RAILS_ENV" => "test" }, "bin/rails", "runner", script, chdir: Rails.root.to_s)

    assert status.success?, output
    # "You need to sign in or sign up" would mean no strategy ran at all.
    assert_includes output, "Invalid email or password"
  end
end
