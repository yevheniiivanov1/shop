# Admin: edit the items table. Listing uses the public GET /api/items.
module Api
  module Admin
    class ItemsController < BaseController
      before_action :set_item, only: [ :update, :destroy ]

      def create
        item = Item.new(item_params)
        if item.save
          render json: { item: ItemSerializer.call(item) }, status: :created
        else
          render_errors(item)
        end
      end

      def update
        if @item.update(item_params)
          render json: { item: ItemSerializer.call(@item) }
        else
          render_errors(@item)
        end
      end

      def destroy
        if @item.destroy
          head :no_content
        else
          render_errors(@item)
        end
      end

      private

      def set_item
        @item = Item.find(params[:id])
      end

      def item_params
        params.expect(item: [ :name, :description, :price ])
      end
    end
  end
end
