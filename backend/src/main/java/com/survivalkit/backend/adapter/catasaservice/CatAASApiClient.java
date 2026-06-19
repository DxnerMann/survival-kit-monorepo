package com.survivalkit.backend.adapter.catasaservice;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class CatAASApiClient implements CatAASPort {

    private final RestClient restClient;

    public CatAASApiClient(RestClient restClient) {
        this.restClient = restClient;
    }

    @Override
    public byte[] getRandomCatImage(int width, int height) {
        return restClient.get()
                .uri("https://cataas.com/cat?width={width}&height={height}", width, height)
                .retrieve()
                .body(byte[].class);
    }
}
