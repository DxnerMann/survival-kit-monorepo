package com.survivalkit.backend.core.rank;

import java.util.Collection;
import java.util.List;

public interface XpPort {

    void award(String userId, XpRules.Action action);

    UserRankView mine();

    List<UserRankView> findByUsers(Collection<String> userIds);
}
