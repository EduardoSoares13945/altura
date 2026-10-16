package com.altura.api.service;

import com.altura.api.exception.ApiException;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class S3FeedImageStorage implements FeedImageStorage {
    private static final Logger LOGGER = LoggerFactory.getLogger(S3FeedImageStorage.class);
    private static final long MAX_IMAGE_BYTES = 1_000_000;
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );

    private final String bucket;
    private final Duration signedUrlDuration;
    private final S3Client client;
    private final S3Presigner presigner;

    public S3FeedImageStorage(
            @Value("${app.storage.endpoint:}") String endpoint,
            @Value("${app.storage.region:us-east-2}") String region,
            @Value("${app.storage.access-key:}") String accessKey,
            @Value("${app.storage.secret-key:}") String secretKey,
            @Value("${app.storage.bucket:}") String bucket,
            @Value("${app.storage.signed-url-minutes:60}") long signedUrlMinutes
    ) {
        this.bucket = bucket == null ? "" : bucket.trim();
        this.signedUrlDuration = Duration.ofMinutes(Math.max(5, Math.min(signedUrlMinutes, 720)));

        if (isBlank(endpoint) || isBlank(accessKey) || isBlank(secretKey) || this.bucket.isBlank()) {
            this.client = null;
            this.presigner = null;
            LOGGER.warn("Neon Object Storage não configurado; uploads de imagens do feed estão desativados.");
            return;
        }

        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey.trim(), secretKey.trim());
        StaticCredentialsProvider provider = StaticCredentialsProvider.create(credentials);
        S3Configuration configuration = S3Configuration.builder().pathStyleAccessEnabled(true).build();
        URI endpointUri = URI.create(endpoint.trim().replaceAll("/+$", ""));
        Region awsRegion = Region.of(region.trim());

        this.client = S3Client.builder()
                .endpointOverride(endpointUri)
                .region(awsRegion)
                .credentialsProvider(provider)
                .serviceConfiguration(configuration)
                .build();
        this.presigner = S3Presigner.builder()
                .endpointOverride(endpointUri)
                .region(awsRegion)
                .credentialsProvider(provider)
                .serviceConfiguration(configuration)
                .build();
    }

    @Override
    public String store(UUID ownerId, MultipartFile file) {
        requireConfigured();
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Selecione uma imagem para a publicação.");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "A imagem processada deve ter no máximo 1 MB.");
        }

        String contentType = normalizeContentType(file.getContentType());
        String extension = EXTENSIONS.get(contentType);
        if (extension == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Envie uma imagem JPG, PNG ou WebP.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Não foi possível ler a imagem enviada.");
        }
        if (!matchesSignature(bytes, contentType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "O arquivo enviado não é uma imagem válida.");
        }

        String key = "feed/" + ownerId + "/" + UUID.randomUUID() + "." + extension;
        try {
            client.putObject(PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentType)
                            .cacheControl("private, max-age=3600")
                            .build(),
                    RequestBody.fromBytes(bytes));
            return key;
        } catch (RuntimeException exception) {
            LOGGER.error("Falha ao enviar imagem do feed para o Object Storage.", exception);
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "O armazenamento de imagens está indisponível. Tente novamente em instantes.");
        }
    }

    @Override
    public String signedUrl(String key) {
        if (isBlank(key)) return null;
        if (presigner == null) return null;
        try {
            GetObjectRequest get = GetObjectRequest.builder().bucket(bucket).key(key).build();
            return presigner.presignGetObject(GetObjectPresignRequest.builder()
                            .signatureDuration(signedUrlDuration)
                            .getObjectRequest(get)
                            .build())
                    .url().toString();
        } catch (RuntimeException exception) {
            LOGGER.error("Falha ao assinar URL da imagem {}.", key, exception);
            return null;
        }
    }

    @Override
    public void deleteQuietly(String key) {
        if (client == null || isBlank(key)) return;
        try {
            client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (RuntimeException exception) {
            LOGGER.warn("Não foi possível remover a imagem órfã {} do Object Storage.", key, exception);
        }
    }

    @PreDestroy
    void close() {
        if (client != null) client.close();
        if (presigner != null) presigner.close();
    }

    private void requireConfigured() {
        if (client == null || presigner == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Configure o Neon Object Storage para publicar imagens.");
        }
    }

    private String normalizeContentType(String value) {
        if (value == null) return "";
        return value.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
    }

    private boolean matchesSignature(byte[] bytes, String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> bytes.length >= 3
                    && unsigned(bytes[0]) == 0xFF && unsigned(bytes[1]) == 0xD8 && unsigned(bytes[2]) == 0xFF;
            case "image/png" -> bytes.length >= 8
                    && unsigned(bytes[0]) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E
                    && bytes[3] == 0x47 && bytes[4] == 0x0D && bytes[5] == 0x0A
                    && bytes[6] == 0x1A && bytes[7] == 0x0A;
            case "image/webp" -> bytes.length >= 12
                    && ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP");
            default -> false;
        };
    }

    private int unsigned(byte value) {
        return value & 0xFF;
    }

    private boolean ascii(byte[] bytes, int offset, String expected) {
        if (bytes.length < offset + expected.length()) return false;
        for (int index = 0; index < expected.length(); index++) {
            if (bytes[offset + index] != (byte) expected.charAt(index)) return false;
        }
        return true;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
