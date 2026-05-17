class CreateRefreshTokens < ActiveRecord::Migration[7.1]
  def change
    create_table :refresh_tokens, id: :uuid do |t|
      t.references :member, type: :uuid, null: false, foreign_key: true
      t.string :token_hash, null: false
      t.datetime :expires_at, null: false
      t.datetime :revoked_at
      t.datetime :created_at, null: false
    end
    add_index :refresh_tokens, :token_hash, unique: true
  end
end
