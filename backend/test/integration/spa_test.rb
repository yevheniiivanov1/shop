require "test_helper"

class SpaTest < ActionDispatch::IntegrationTest
  test "client-side routes fall back to the React app" do
    with_spa_index("<html>shop</html>") do
      get "/orders/42", headers: { "Accept" => "text/html" }

      assert_response :success
      assert_equal "<html>shop</html>", response.body
      assert_equal "no-cache", response.headers["Cache-Control"]
    end
  end

  test "missing assets and unknown API paths are real 404s" do
    with_spa_index("<html>shop</html>") do
      get "/assets/missing.js", headers: { "Accept" => "*/*" }
      assert_response :not_found
      assert_not_equal "<html>shop</html>", response.body

      get "/api/nope", headers: { "Accept" => "text/html" }
      assert_response :not_found
    end
  end

  private

  def with_spa_index(html)
    path = SpaController::INDEX
    existed = path.exist?
    original = path.read if existed
    path.dirname.mkpath
    path.write(html)
    yield
  ensure
    existed ? path.write(original) : path.delete
  end
end
