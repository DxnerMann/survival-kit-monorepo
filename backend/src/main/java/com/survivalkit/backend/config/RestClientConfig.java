package com.survivalkit.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.net.http.HttpClient;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.time.Duration;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient restClient(
            @Value("${app.rest-client.insecure-skip-tls-verify:false}") boolean insecureSkipTlsVerify
    ) {
        var httpClientBuilder = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .followRedirects(HttpClient.Redirect.NEVER);

        if (insecureSkipTlsVerify) {
            httpClientBuilder.sslContext(insecureSslContext());
        }

        var requestFactory = new JdkClientHttpRequestFactory(httpClientBuilder.build());
        requestFactory.setReadTimeout(Duration.ofSeconds(10));

        return RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    private static SSLContext insecureSslContext() {
        try {
            var trustAll = new X509TrustManager() {
                @Override
                public void checkClientTrusted(X509Certificate[] chain, String authType) {}

                @Override
                public void checkServerTrusted(X509Certificate[] chain, String authType) {}

                @Override
                public X509Certificate[] getAcceptedIssuers() {
                    return new X509Certificate[0];
                }
            };

            var sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, new TrustManager[]{trustAll}, new SecureRandom());
            return sslContext;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to create insecure SSL context", exception);
        }
    }
}
