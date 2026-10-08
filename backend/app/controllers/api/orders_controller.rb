# The signed-in user's own orders.
# GET  /api/orders
# GET  /api/orders/:id
# POST /api/orders  { items: [{ item_id, quantity }, ...] }  - "pay" for the cart
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
      result = Checkout.call(user: current_user, lines: params.permit(items: [ :item_id, :quantity ])[:items])

      if result.success?
        render json: { order: OrderSerializer.detailed(result.order) }, status: :created
      else
        render json: { error: result.errors.first, errors: result.errors }, status: :unprocessable_content
      end
    end
  end
end
