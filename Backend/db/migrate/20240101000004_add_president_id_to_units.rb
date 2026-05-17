class AddPresidentIdToUnits < ActiveRecord::Migration[7.1]
  def change
    add_reference :units, :president, type: :uuid, foreign_key: { to_table: :members }, null: true
  end
end
