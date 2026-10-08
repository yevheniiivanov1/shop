# Money goes over the wire as a decimal string ("1299.00"): never as a float
# and never in a locale-specific format.
module Money
  def self.format(value)
    ActiveSupport::NumberHelper.number_to_rounded(value, precision: 2, separator: ".", delimiter: "")
  end
end
