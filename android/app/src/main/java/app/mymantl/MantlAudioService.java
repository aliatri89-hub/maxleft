package app.mymantl;

import androidx.annotation.OptIn;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.CommandButton;
import androidx.media3.session.MediaSession;

import com.google.common.collect.ImmutableList;

import us.mediagrid.capacitorjs.plugins.nativeaudio.AudioPlayerService;

/**
 * Extends the mediagrid AudioPlayerService to override the notification
 * button layout with proper podcast seek icons (⏪15 ▶ ⏩30).
 */
@OptIn(markerClass = UnstableApi.class)
public class MantlAudioService extends AudioPlayerService {

    @Override
    public void onCreate() {
        super.onCreate();

        MediaSession session = onGetSession(null);
        if (session != null) {
            CommandButton seekBackButton = new CommandButton.Builder(CommandButton.ICON_SKIP_BACK_15)
                    .setPlayerCommand(Player.COMMAND_SEEK_BACK)
                    .setSlots(CommandButton.SLOT_BACK)
                    .build();

            CommandButton seekForwardButton = new CommandButton.Builder(CommandButton.ICON_SKIP_FORWARD_30)
                    .setPlayerCommand(Player.COMMAND_SEEK_FORWARD)
                    .setSlots(CommandButton.SLOT_FORWARD)
                    .build();

            session.setMediaButtonPreferences(
                    ImmutableList.of(seekBackButton, seekForwardButton)
            );
        }
    }
}
