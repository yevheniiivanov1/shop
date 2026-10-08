# Public catalog.
# GET /api/items?q=laptop&sort=price_asc&page=1&per_page=20
# GET /api/items?ids=3,7,12  - current data for the items in a cart
# GET /api/items/:id
module Api
  class ItemsController < ApplicationController
    def index
      scope = Item.search(string_param(:q)).sorted_by(string_param(:sort))
      scope = scope.where(id: id_list) if string_param(:ids)
      items, meta = paginate(scope)

      render json: { items: items.map { ItemSerializer.call(_1) }, meta: }
    end

    def show
      render json: { item: ItemSerializer.call(Item.find(params[:id])) }
    end

    private

    def id_list
      string_param(:ids).split(",").filter_map { Integer(_1.strip, 10, exception: false) }.first(Checkout::MAX_LINES)
    end
  end
end
