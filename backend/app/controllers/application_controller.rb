class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActionController::RequestForgeryProtection

  CSRF_COOKIE = "CSRF-TOKEN".freeze

  class Forbidden < StandardError; end

  # The session lives in a cookie, so state-changing requests must carry the
  # CSRF token. The client reads it from the CSRF-TOKEN cookie and sends it
  # back in the X-CSRF-Token header.
  self.allow_forgery_protection = Rails.configuration.action_controller.allow_forgery_protection != false
  protect_from_forgery with: :exception
  after_action :set_csrf_cookie

  rescue_from ActiveRecord::RecordNotFound do
    render json: { error: I18n.t("api.errors.not_found") }, status: :not_found
  end

  rescue_from ActionController::ParameterMissing do |e|
    render json: { error: e.message }, status: :bad_request
  end

  rescue_from Forbidden do
    render json: { error: I18n.t("api.errors.forbidden") }, status: :forbidden
  end

  rescue_from ActionController::InvalidAuthenticityToken do
    set_csrf_cookie
    render json: { error: I18n.t("api.errors.invalid_csrf"), code: "invalid_csrf_token" }, status: :unprocessable_content
  end

  private

  def require_admin!
    raise Forbidden unless current_user&.admin?
  end

  def render_errors(record, status: :unprocessable_content)
    messages = record.errors.full_messages
    render json: { error: messages.first, errors: messages }, status:
  end

  # Query params are user input: `?q[]=x` or `?q[a]=b` arrive as an Array or a
  # Hash. Simple filters only take plain strings and ignore anything else.
  def string_param(key)
    value = params[key]
    value if value.is_a?(String)
  end

  def integer_param(key, default)
    value = string_param(key)
    (value && Integer(value, 10, exception: false)) || default
  end

  def paginate(scope)
    per_page = integer_param(:per_page, 20).clamp(1, 100)
    page = integer_param(:page, 1).clamp(1, 1_000_000)
    total = scope.count

    records = scope.offset((page - 1) * per_page).limit(per_page)
    [ records, { page:, per_page:, total:, total_pages: (total / per_page.to_f).ceil } ]
  end

  def set_csrf_cookie
    cookies[CSRF_COOKIE] = { value: form_authenticity_token, same_site: :lax }
  end
end
