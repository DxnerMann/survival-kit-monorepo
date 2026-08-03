package com.survivalkit.backend.core.qucklink;

import com.survivalkit.backend.adapter.postgres.favourites.FavouritePersistancePort;
import com.survivalkit.backend.adapter.postgres.quicklink.QuickLink;
import com.survivalkit.backend.adapter.postgres.quicklink.QuickLinkPersistancePort;
import com.survivalkit.backend.adapter.postgres.usetracking.TrackAction;
import com.survivalkit.backend.adapter.web.ErrorCode;
import com.survivalkit.backend.adapter.web.quicklink.QuickLinkApprovementRequest;
import com.survivalkit.backend.adapter.web.quicklink.QuickLinkSuggestionRequest;
import com.survivalkit.backend.context.SecurityContext;
import com.survivalkit.backend.core.statistics.StatisticsPort;
import com.survivalkit.backend.shared.Page;
import io.viascom.nanoid.NanoId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

import static com.survivalkit.backend.context.SecurityContext.requireVerification;

@Service
public class QuickLinkService implements QuickLinkPort {

    private final QuickLinkPersistancePort quickLinkPersistancePort;
    private final FavouritePersistancePort favouritePersistancePort;
    private final StatisticsPort statisticsPort;

    public QuickLinkService(QuickLinkPersistancePort quickLinkPersistancePort, FavouritePersistancePort favouritePersistancePort, StatisticsPort statisticsPort) {
        this.quickLinkPersistancePort = quickLinkPersistancePort;
        this.favouritePersistancePort = favouritePersistancePort;
        this.statisticsPort = statisticsPort;
    }

    @Override
    public void clickLink(String linkId) {
        quickLinkPersistancePort.incrementClickedLink(linkId);
        statisticsPort.saveTrackAction(TrackAction.Action.GAME_PLAYED);
    }

    @Override
    public Page<QuickLink> getQuickLinksFiltered(boolean approved, Integer pageSize, String continuation, boolean sortByPopularity) {

        pageSize = pageSize == null ? 20 : pageSize;
        pageSize = pageSize > 50 ? 50 : pageSize;

        return quickLinkPersistancePort.getQuickLinksFiltered(approved, pageSize, continuation, sortByPopularity);
    }

    @Override
    public void suggestLink(QuickLinkSuggestionRequest suggestion) {

        requireVerification();

        if (suggestion.title() == null || suggestion.title().isEmpty()) {
            throw new IllegalArgumentException(ErrorCode.QUICKLINK_TITLE_CANNOT_BE_EMPTY.getCode());
        }

        if (suggestion.description() == null || suggestion.description().isEmpty()) {
            throw new IllegalArgumentException(ErrorCode.QUICKLINK_DESCRIPTION_CANNOT_BE_EMPTY.getCode());
        }

        if (suggestion.url() == null || suggestion.url().isEmpty()) {
            throw new IllegalArgumentException(ErrorCode.QUICKLINK_URL_CANNOT_BE_EMPTY.getCode());
        }

        if (!isHttpUrl(suggestion.url())) {
            throw new IllegalArgumentException(ErrorCode.QUICKLINK_URL_INVALID.getCode());
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
        statisticsPort.saveTrackAction(TrackAction.Action.GAME_SUGGESTED);
    }

    @Override
    public void approveOrDisApprove(QuickLinkApprovementRequest request) {

        requireVerification();

        if (!request.approved()) {
            quickLinkPersistancePort.deleteQuickLink(request.linkId());
            return;
        }

        var improvedTitle = request.improvedTitle();
        var improvedDescription = request.improvedDescription();
        var title = improvedTitle == null || improvedTitle.isBlank() ? null : improvedTitle.trim();
        var description = improvedDescription == null || improvedDescription.isBlank() ? null : improvedDescription.trim();

        quickLinkPersistancePort.approveQuickLink(request.linkId(), title, description);
    }

    @Override
    public void markAsFav(String quickLinkId, boolean fav) {

        requireVerification();

        var user = SecurityContext.current();
        if (fav) {
            favouritePersistancePort.addFav(user.userId(), quickLinkId);
            return;
        }
        favouritePersistancePort.deleteFav(user.userId(), quickLinkId);
    }

    @Override
    public Page<QuickLink> getFavouritesFiltered(Integer pageSize, String continuation) {
        pageSize = pageSize == null ? 20 : pageSize;
        pageSize = pageSize > 50 ? 50 : pageSize;

        var user = SecurityContext.current();
        var favIds = favouritePersistancePort.getFavouritesForUser(user.userId(), continuation, pageSize);

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

    private static boolean isHttpUrl(String url) {
        try {
            var uri = java.net.URI.create(url.trim());
            var scheme = uri.getScheme();
            return uri.getHost() != null
                    && ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
