package com.survivalkit.backend.adapter.catasaservice;

import org.springframework.core.io.Resource;

public interface CatAASPort {

    byte[] getRandomCatImage(int width, int height);
}
