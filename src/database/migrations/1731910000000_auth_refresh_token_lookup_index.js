/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.noTransaction();
  pgm.createIndex("auth_refresh_tokens", ["token_hash", "expires_at"], {
    name: "idx_auth_refresh_tokens_active_token_hash_expires_at",
    concurrently: true,
    ifNotExists: true,
    where: "revoked_at IS NULL"
  });
};

exports.down = (pgm) => {
  pgm.noTransaction();
  pgm.dropIndex("auth_refresh_tokens", ["token_hash", "expires_at"], {
    name: "idx_auth_refresh_tokens_active_token_hash_expires_at",
    concurrently: true,
    ifExists: true
  });
};
