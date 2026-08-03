package com.survivalkit.backend.adapter.catasaservice;

import com.survivalkit.backend.adapter.web.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class CatAASApiClient implements CatAASPort {

    private final RestClient restClient;

    public CatAASApiClient(RestClient restClient) {
        this.restClient = restClient;
    }

    @Override
    public byte[] getRandomCatImage(int width, int height) {
        try {
            return restClient.get()
                    .uri("https://cataas.com/cat?width={width}&height={height}", width, height)
                    .retrieve()
                    .body(byte[].class);
        } catch (RestClientException e) {
            throw new RuntimeException(ErrorCode.CATAAS_REQUEST_FAILED.getCode(), e);
        }
    }
}
