package com.altura.api.repository;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcAuthRepository implements AuthRepository {
    private static final RowMapper<AuthUser> USER_MAPPER = (result, row) -> new AuthUser(
            result.getObject("id", UUID.class),
            result.getString("email"),
            result.getString("password_hash"),
            result.getString("nome"),
            result.getString("tipo"),
            result.getBoolean("ativo")
    );

    private final JdbcTemplate jdbc;

    public JdbcAuthRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<AuthUser> findById(UUID id) {
        return first(jdbc.query("""
                select id, email, password_hash, nome, tipo::text as tipo, ativo
                from public.usuario
                where id = ?
                """, USER_MAPPER, id));
    }

    @Override
    public Optional<AuthUser> findByEmail(String email) {
        return first(jdbc.query("""
                select id, email, password_hash, nome, tipo::text as tipo, ativo
                from public.usuario
                where email = ?
                """, USER_MAPPER, normalizeEmail(email)));
    }

    @Override
    public AuthUser save(AuthUser user) {
        String email = normalizeEmail(user.email());
        try {
            return jdbc.queryForObject("""
                    insert into public.usuario (id, email, password_hash, nome, tipo, ativo)
                    values (?, ?, ?, ?, ?::public.tipo_usuario, ?)
                    returning id, email, password_hash, nome, tipo::text as tipo, ativo
                    """, USER_MAPPER, user.id(), email, user.passwordHash(), user.name().trim(),
                    user.type(), user.active());
        } catch (DuplicateKeyException exception) {
            throw new IllegalStateException("E-mail já cadastrado.", exception);
        }
    }

    @Override
    public void updateName(UUID id, String name) {
        jdbc.update("update public.usuario set nome = ? where id = ?", name.trim(), id);
    }

    @Override
    public void saveRefreshToken(UUID userId, String tokenHash, Instant expiresAt) {
        jdbc.update("""
                insert into public.refresh_token (usuario_id, token_hash, expires_at)
                values (?, ?, ?)
                """, userId, tokenHash, Timestamp.from(expiresAt));
    }

    @Override
    public Optional<UUID> consumeRefreshToken(String tokenHash, Instant now) {
        List<UUID> ids = jdbc.query("""
                update public.refresh_token
                set revoked_at = ?
                where token_hash = ? and revoked_at is null and expires_at > ?
                returning usuario_id
                """, (result, row) -> result.getObject("usuario_id", UUID.class),
                Timestamp.from(now), tokenHash, Timestamp.from(now));
        return first(ids);
    }

    @Override
    public void revokeRefreshToken(String tokenHash, Instant now) {
        jdbc.update("""
                update public.refresh_token
                set revoked_at = coalesce(revoked_at, ?)
                where token_hash = ?
                """, Timestamp.from(now), tokenHash);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static <T> Optional<T> first(List<T> items) {
        return items.stream().findFirst();
    }
}
