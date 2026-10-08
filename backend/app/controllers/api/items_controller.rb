# Public catalog.
# GET /api/items?q=laptop&sort=price_asc&page=1&per_page=20
# GET /api/items/:id
module Api
  class ItemsController < ApplicationController
    def index
      scope = Item.search(params[:q]).sorted_by(params[:sort])
      items, meta = paginate(scope)

      render json: { items: items.map { ItemSerializer.call(_1) }, meta: }
    end

    def show
      render json: { item: ItemSerializer.call(Item.find(params[:id])) }
    end
  end
end
