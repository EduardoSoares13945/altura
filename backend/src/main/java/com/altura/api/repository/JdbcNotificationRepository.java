package com.altura.api.repository;

import com.altura.api.dto.NotificationResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class JdbcNotificationRepository implements NotificationRepository {
    private final JdbcTemplate jdbc;

    public JdbcNotificationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void create(UUID recipientId, UUID actorId, String type, long referenceId,
                       String title, String message, String destination) {
        if (recipientId.equals(actorId)) return;
        jdbc.update("""
                insert into public.notificacao (
                    usuario_id, ator_usuario_id, tipo, referencia_id, titulo, mensagem, destino
                ) values (?, ?, ?, ?, ?, ?, ?)
                on conflict (usuario_id, ator_usuario_id, tipo, referencia_id)
                do update set titulo = excluded.titulo, mensagem = excluded.mensagem,
                              destino = excluded.destino, lida_em = null, created_at = now()
                """, recipientId, actorId, type, referenceId, title, message, destination);
    }

    @Override
    public List<NotificationResponse> list(UUID userId, int limit) {
        return jdbc.query("""
                select n.id, n.tipo,
                       case when n.tipo = 'comentario' then coalesce(
                           (select pc.postagem_id from public.postagem_comentario pc where pc.id = n.referencia_id),
                           n.referencia_id
                       ) else n.referencia_id end as referencia_id,
                       n.titulo, n.mensagem, n.ator_usuario_id,
                       coalesce(s.nome, i.nome, u.nome) as ator_nome,
                       u.tipo::text as ator_tipo,
                       coalesce(s.imagem_perfil, i.imagem_perfil) as ator_imagem,
                       n.destino, n.lida_em, n.created_at
                from public.notificacao n
                join public.usuario u on u.id = n.ator_usuario_id
                left join public.startup s on s.usuario_id = u.id
                left join public.investidor i on i.usuario_id = u.id
                where n.usuario_id = ?
                order by n.created_at desc, n.id desc
                limit ?
                """, (result, row) -> new NotificationResponse(
                result.getLong("id"), result.getString("tipo"), result.getLong("referencia_id"), result.getString("titulo"),
                result.getString("mensagem"), result.getObject("ator_usuario_id", UUID.class),
                result.getString("ator_nome"), result.getString("ator_tipo"),
                result.getString("ator_imagem"), result.getString("destino"),
                result.getTimestamp("lida_em") != null,
                result.getTimestamp("created_at").toInstant()), userId, limit);
    }

    @Override
    public int unreadCount(UUID userId) {
        Integer count = jdbc.queryForObject("""
                select count(*) from public.notificacao
                where usuario_id = ? and lida_em is null
                """, Integer.class, userId);
        return count == null ? 0 : count;
    }

    @Override
    public boolean markRead(UUID userId, long notificationId) {
        return jdbc.update("""
                update public.notificacao set lida_em = coalesce(lida_em, now())
                where id = ? and usuario_id = ?
                """, notificationId, userId) > 0;
    }

    @Override
    public void markAllRead(UUID userId) {
        jdbc.update("update public.notificacao set lida_em = now() where usuario_id = ? and lida_em is null", userId);
    }

    @Override
    public void deleteAll(UUID userId) {
        jdbc.update("delete from public.notificacao where usuario_id = ?", userId);
    }
}
