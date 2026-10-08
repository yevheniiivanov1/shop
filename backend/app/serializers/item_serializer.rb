module ItemSerializer
  def self.call(item)
    {
      id: item.id,
      name: item.name,
      description: item.description,
      price: Money.format(item.price)
    }
  end
end
