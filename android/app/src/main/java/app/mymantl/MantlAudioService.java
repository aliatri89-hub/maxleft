package app.mymantl;

import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.media3.common.ForwardingPlayer;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.CommandButton;
import androidx.media3.session.MediaSession;
import androidx.media3.session.SessionCommand;

import com.google.common.collect.ImmutableList;

import us.mediagrid.capacitorjs.plugins.nativeaudio.AudioPlayerService;

/**
 * Extends the mediagrid AudioPlayerService to override the notification
 * button layout with proper podcast seek icons (⏪15 ▶ ⏩30).
 *
 * Media3's default notification shows prev/next track arrows when no
 * custom button preferences are set. This override explicitly sets
 * seek forward/backward command buttons with the standard skip icons.
 */
@OptIn(markerClass = UnstableApi.class)
public class MantlAudioService extends AudioPlayerService {

    @Override
    public void onCreate() {
        super.onCreate();

        MediaSession session = onGetSession(null);
        if (session != null) {
            // Configure the player's seek increments
            Player player = session.getPlayer();
            if (player instanceof ForwardingPlayer) {
                // Can't easily set increments on a forwarding player,
                // but the command buttons below handle the UI
            }

            // Set media button preferences with proper seek icons
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
