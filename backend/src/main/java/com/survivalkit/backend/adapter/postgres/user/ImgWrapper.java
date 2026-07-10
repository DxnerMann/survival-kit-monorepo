package com.survivalkit.backend.adapter.postgres.user;

public record ImgWrapper(
        byte[] img,
        ProfileImgType imgType
) {
    public enum ProfileImgType {
        PNG,
        JPG,
        GIF
    }
}
