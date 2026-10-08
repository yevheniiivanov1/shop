# The signed-in user's own orders.
# GET  /api/orders
# GET  /api/orders/:id
# POST /api/orders  { items: [{ item_id, quantity }, ...], expected_amount: "198.00" }  - "pay" for the cart
#   409 + code "prices_changed" when the total isn't the one the customer saw,
#   422 + code "items_not_found" and missing_item_ids when items are gone.
module Api
  class OrdersController < ApplicationController
    before_action :authenticate_user!

    def index
      scope = current_user.orders.includes(:order_descriptions).order(created_at: :desc, id: :desc)
      orders, meta = paginate(scope)

      render json: { orders: orders.map { OrderSerializer.call(_1) }, meta: }
    end

    def show
      order = current_user.orders.includes(order_descriptions: :item).find(params[:id])

      render json: { order: OrderSerializer.detailed(order) }
    end

    def create
      result = Checkout.call(user: current_user,
                             lines: params.permit(items: [ :item_id, :quantity ])[:items],
                             expected_amount: params[:expected_amount])

      if result.success?
        render json: { order: OrderSerializer.detailed(result.order) }, status: :created
      else
        body = { error: result.errors.first, errors: result.errors, code: result.code }.compact
        body[:missing_item_ids] = result.missing_item_ids if result.missing_item_ids.any?
        render json: body, status: result.code == :prices_changed ? :conflict : :unprocessable_content
      end
    end
  end
end
