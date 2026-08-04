package com.survivalkit.backend.core.presentationgame;

import com.survivalkit.backend.adapter.postgres.presentationgame.PresentationGameRoom;

import java.util.Collection;
import java.util.List;

public interface GermanWordPort {

    List<String> fetchWords(
            int count,
            PresentationGameRoom.Difficulty difficulty,
            Collection<String> exclude
    );
}
