package com.altura.api.repository;

import com.altura.api.dto.CreatePostRequest;
import com.altura.api.dto.FeedCommentResponse;
import com.altura.api.dto.FeedPostResponse;
import com.altura.api.dto.LikeResponse;
import com.altura.api.service.FeedImageStorage;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JdbcFeedRepository implements FeedRepository {
    private static final String POST_SELECT = """
            select p.id, p.usuario_id, coalesce(s.nome, i.nome, u.nome) as autor_nome,
                   u.tipo::text as autor_tipo,
                   case when u.tipo = 'startup' then sg.nome
                        else i.tipo end as autor_descricao,
                   coalesce(s.imagem_perfil, i.imagem_perfil) as autor_imagem,
                   p.conteudo, p.categoria, p.metrica_rotulo, p.metrica_valor,
                   p.imagem_chave, p.youtube_video_id, p.created_at,
                   (select count(*) from public.postagem_curtida pc where pc.postagem_id = p.id) as curtidas,
                   exists(select 1 from public.postagem_curtida pc
                          where pc.postagem_id = p.id and pc.usuario_id = ?) as curtido_por_mim,
                   p.usuario_id = ? as meu_post
            from public.postagem p
            join public.usuario u on u.id = p.usuario_id and u.ativo = true
            left join public.startup s on s.usuario_id = u.id
            left join public.segmento sg on sg.id = s.segmento_id
            left join public.investidor i on i.usuario_id = u.id
            """;

    private final JdbcTemplate jdbc;
    private final FeedImageStorage imageStorage;

    public JdbcFeedRepository(JdbcTemplate jdbc, FeedImageStorage imageStorage) {
        this.jdbc = jdbc;
        this.imageStorage = imageStorage;
    }

    @Override
    public List<FeedPostResponse> list(UUID viewerId, int limit) {
        List<PostRow> rows = jdbc.query(POST_SELECT + " where u.tipo = 'startup' order by p.created_at desc, p.id desc limit ?",
                (result, row) -> mapPost(result), viewerId, viewerId, limit);
        return rows.stream().map(row -> toResponse(row, comments(row.id()))).toList();
    }

    @Override
    public List<FeedPostResponse> listByAuthor(UUID viewerId, UUID authorId, int limit) {
        List<PostRow> rows = jdbc.query(POST_SELECT + """
                 where u.tipo = 'startup' and p.usuario_id = ?
                 order by p.created_at desc, p.id desc limit ?
                """, (result, row) -> mapPost(result), viewerId, viewerId, authorId, limit);
        return rows.stream().map(row -> toResponse(row, comments(row.id()))).toList();
    }

    @Override
    public Optional<FeedPostResponse> findById(UUID viewerId, long postId) {
        List<PostRow> rows = jdbc.query(POST_SELECT + " where p.id = ? and u.tipo = 'startup'",
                (result, row) -> mapPost(result), viewerId, viewerId, postId);
        if (rows.isEmpty()) return Optional.empty();
        PostRow row = rows.get(0);
        return Optional.of(toResponse(row, comments(postId)));
    }

    @Override
    public Optional<UUID> authorId(long postId) {
        List<UUID> rows = jdbc.query("select usuario_id from public.postagem where id = ?",
                (result, row) -> result.getObject("usuario_id", UUID.class), postId);
        return rows.stream().findFirst();
    }

    @Override
    public FeedPostResponse create(UUID userId, CreatePostRequest request, String imageKey) {
        Long id = jdbc.queryForObject("""
                insert into public.postagem (
                    usuario_id, conteudo, categoria, metrica_rotulo, metrica_valor,
                    imagem_chave, youtube_video_id
                ) values (?, ?, ?, ?, ?, ?, ?)
                returning id
                """, Long.class, userId, request.conteudo().trim(), request.categoria(),
                blankToNull(request.metricaRotulo()), blankToNull(request.metricaValor()),
                imageKey, blankToNull(request.youtubeVideoId()));
        return findById(userId, id).orElseThrow();
    }

    @Override
    public String findOwnedImageKey(UUID userId, long postId) {
        List<String> keys = jdbc.query("""
                select imagem_chave from public.postagem
                where id = ? and usuario_id = ? and imagem_chave is not null
                """, (result, row) -> result.getString("imagem_chave"), postId, userId);
        return keys.isEmpty() ? null : keys.get(0);
    }

    @Override
    public boolean deleteOwned(UUID userId, long postId) {
        return jdbc.update("delete from public.postagem where id = ? and usuario_id = ?", postId, userId) > 0;
    }

    @Override
    public LikeResponse toggleLike(UUID userId, long postId) {
        int inserted = jdbc.update("""
                insert into public.postagem_curtida (postagem_id, usuario_id)
                values (?, ?) on conflict do nothing
                """, postId, userId);
        boolean liked = inserted > 0;
        if (!liked) {
            jdbc.update("delete from public.postagem_curtida where postagem_id = ? and usuario_id = ?",
                    postId, userId);
        }
        Integer count = jdbc.queryForObject(
                "select count(*) from public.postagem_curtida where postagem_id = ?", Integer.class, postId);
        return new LikeResponse(liked, count == null ? 0 : count);
    }

    @Override
    public FeedCommentResponse addComment(UUID userId, long postId, String content) {
        Long id = jdbc.queryForObject("""
                insert into public.postagem_comentario (postagem_id, usuario_id, conteudo)
                values (?, ?, ?) returning id
                """, Long.class, postId, userId, content.trim());
        return comment(id).orElseThrow();
    }

    @Override
    public boolean exists(long postId) {
        Integer count = jdbc.queryForObject(
                "select count(*) from public.postagem where id = ?", Integer.class, postId);
        return count != null && count > 0;
    }

    private List<FeedCommentResponse> comments(long postId) {
        return jdbc.query("""
                select pc.id, pc.usuario_id,
                       coalesce(s.nome, i.nome, u.nome) as autor_nome,
                       u.tipo::text as autor_tipo, coalesce(s.imagem_perfil, i.imagem_perfil) as autor_imagem,
                       pc.conteudo, pc.created_at
                from public.postagem_comentario pc
                join public.usuario u on u.id = pc.usuario_id and u.ativo = true
                left join public.startup s on s.usuario_id = u.id
                left join public.investidor i on i.usuario_id = u.id
                where pc.postagem_id = ?
                order by pc.created_at, pc.id
                """, (result, row) -> mapComment(result), postId);
    }

    private Optional<FeedCommentResponse> comment(long commentId) {
        List<FeedCommentResponse> rows = jdbc.query("""
                select pc.id, pc.usuario_id,
                       coalesce(s.nome, i.nome, u.nome) as autor_nome,
                       u.tipo::text as autor_tipo, coalesce(s.imagem_perfil, i.imagem_perfil) as autor_imagem,
                       pc.conteudo, pc.created_at
                from public.postagem_comentario pc
                join public.usuario u on u.id = pc.usuario_id
                left join public.startup s on s.usuario_id = u.id
                left join public.investidor i on i.usuario_id = u.id
                where pc.id = ?
                """, (result, row) -> mapComment(result), commentId);
        return rows.stream().findFirst();
    }

    private PostRow mapPost(ResultSet result) throws SQLException {
        return new PostRow(
                result.getLong("id"), result.getObject("usuario_id", UUID.class),
                result.getString("autor_nome"), result.getString("autor_tipo"),
                result.getString("autor_descricao"), result.getString("autor_imagem"), result.getString("conteudo"),
                result.getString("categoria"), result.getString("metrica_rotulo"),
                result.getString("metrica_valor"), result.getString("imagem_chave"),
                result.getString("youtube_video_id"), result.getTimestamp("created_at").toInstant(),
                result.getInt("curtidas"), result.getBoolean("curtido_por_mim"),
                result.getBoolean("meu_post"));
    }

    private FeedCommentResponse mapComment(ResultSet result) throws SQLException {
        return new FeedCommentResponse(
                result.getLong("id"), result.getObject("usuario_id", UUID.class),
                result.getString("autor_nome"), result.getString("autor_tipo"),
                result.getString("autor_imagem"), result.getString("conteudo"),
                result.getTimestamp("created_at").toInstant());
    }

    private FeedPostResponse toResponse(PostRow row, List<FeedCommentResponse> comments) {
        return new FeedPostResponse(
                row.id(), row.authorId(), row.authorName(), row.authorType(), row.authorDescription(),
                row.authorImage(), row.content(), row.category(), row.metricLabel(), row.metricValue(),
                imageStorage.signedUrl(row.imageKey()), row.youtubeVideoId(), row.createdAt(),
                row.likes(), row.likedByMe(), row.mine(), comments);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record PostRow(long id, UUID authorId, String authorName, String authorType,
                           String authorDescription, String authorImage, String content, String category,
                           String metricLabel, String metricValue, String imageKey, String youtubeVideoId,
                           Instant createdAt,
                           int likes, boolean likedByMe, boolean mine) {}
}
