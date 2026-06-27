package com.survivalkit.backend.core.qucklink;

import com.survivalkit.backend.adapter.postgres.favourites.FavouritePersistancePort;
import com.survivalkit.backend.adapter.postgres.quicklink.QuickLink;
import com.survivalkit.backend.adapter.postgres.quicklink.QuickLinkPersistancePort;
import com.survivalkit.backend.adapter.web.quicklink.QuickLinkApprovementRequest;
import com.survivalkit.backend.adapter.web.quicklink.QuickLinkSuggestionRequest;
import com.survivalkit.backend.config.SecurityContext;
import com.survivalkit.backend.shared.Page;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class QuickLinkService implements QuickLinkPort {

    private final QuickLinkPersistancePort quickLinkPersistancePort;
    private final FavouritePersistancePort favouritePersistancePort;

    public QuickLinkService(QuickLinkPersistancePort quickLinkPersistancePort, FavouritePersistancePort favouritePersistancePort) {
        this.quickLinkPersistancePort = quickLinkPersistancePort;
        this.favouritePersistancePort = favouritePersistancePort;
    }

    @Override
    public void clickLink(String linkId) {
        quickLinkPersistancePort.incrementClickedLink(linkId);
    }

    @Override
    public Page<QuickLink> getQuickLinksFiltered(boolean approved, Integer pageSize, String continuation, boolean sortByPopularity) {

        pageSize = pageSize == null ? 20 : pageSize;
        pageSize = pageSize > 50 ? 50 : pageSize;

        return quickLinkPersistancePort.getQuickLinksFiltered(approved, pageSize, continuation, sortByPopularity);
    }

    @Override
    public void suggestLink(QuickLinkSuggestionRequest suggestion) {

        if (suggestion.title() == null || suggestion.title().isEmpty()) {
            throw new IllegalArgumentException("title can not be empty");
        }

        if (suggestion.description() == null || suggestion.description().isEmpty()) {
            throw new IllegalArgumentException("description can not be empty");
        }

        if (suggestion.url() == null || suggestion.url().isEmpty()) {
            throw new IllegalArgumentException("url can not be empty");
        }

        var newLink = new QuickLink(
                NanoId.generate(25),
                suggestion.title(),
                suggestion.description(),
                suggestion.url(),
                0,
                0,
                0,
                false,
                Instant.now(),
                Instant.now(),
                Instant.now()
        );
        quickLinkPersistancePort.upsertquickLink(newLink);
    }

    @Override
    public void approveOrDisApprove(QuickLinkApprovementRequest request) {

        if (!request.approved()) {
            quickLinkPersistancePort.deleteQuickLink(request.linkId());
            return;
        }
        var newLink = new QuickLink(
                request.linkId(),
                request.improvedTitle().isEmpty() ? null : request.improvedTitle(),
                request.improvedDescription().isEmpty() ? null : request.improvedDescription(),
                "",
                0,
                0,
                0,
                true,
                null,
                Instant.now(),
                Instant.now()
        );
        quickLinkPersistancePort.upsertquickLink(newLink);
    }

    @Override
    public void markAsFav(String quickLinkId, boolean fav) {
        var user = SecurityContext.current();

        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }

        if (fav) {
            favouritePersistancePort.addFav(user.get().userId(), quickLinkId);
            return;
        }
        favouritePersistancePort.deleteFav(user.get().userId(), quickLinkId);

    }

    @Override
    public Page<QuickLink> getFavouritesFiltered(Integer pageSize, String continuation) {
        pageSize = pageSize == null ? 20 : pageSize;
        pageSize = pageSize > 50 ? 50 : pageSize;

        var user = SecurityContext.current();

        if (user.isEmpty()) {
            throw new IllegalStateException(
                    "No authenticated user in context. " +
                            "Ensure this is called within a secured request.");
        }

        var favIds = favouritePersistancePort.getFavouritesForUser(user.get().userId(), continuation, pageSize);

        if (favIds.data().isEmpty()) {
            return new Page<>(
                    List.of(),
                    null
            );
        }
        var quickLinks = quickLinkPersistancePort.getFromIds(favIds.data());

        if (quickLinks.isEmpty()) {
            return new Page<>(
                    List.of(),
                    null
            );
        }
        return new Page<>(
                quickLinks,
                favIds.continuation()
        );
    }
}
