package com.survivalkit.backend.adapter.postgres.favourites;

import com.survivalkit.backend.shared.Page;

public interface FavouritePersistancePort {

    void addFav(String userId, String quickLinkId);
    void deleteFav(String userId, String quickLinkId);
    Page<String> getFavouritesForUser(String userId, String continuation, int pageSize);}
