import { supabase } from '../supabase';

/**
 * Reports a dead/broken audio URL to dead_audio_reports.
 * Unique constraint on (episode_id, reported_by) prevents spam.
 * After 3 unique user reports, a DB trigger auto-flags the episode as 'dead'.
 *
 * @param {Object} playerEp — the currentEp from AudioPlayerProvider
 * @param {string} errorInfo — error type string from getAudioErrorInfo()
 */
export async function reportDeadAudio(playerEp, errorInfo = '') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !playerEp?.enclosureUrl) return;

    // Resolve podcast_episodes.id — prefer direct ID, fallback to URL lookup
    let episodeId = playerEp.episodeId || null;

    if (!episodeId) {
      const { data } = await supabase
        .from('podcast_episodes')
        .select('id')
        .eq('audio_url', playerEp.enclosureUrl)
        .limit(1)
        .single();
      episodeId = data?.id || null;
    }

    if (!episodeId) {
      console.warn('[DeadAudio] Could not resolve episode ID for', playerEp.enclosureUrl);
      return;
    }

    const { error } = await supabase
      .from('dead_audio_reports')
      .upsert(
        {
          episode_id: episodeId,
          reported_by: user.id,
          audio_url: playerEp.enclosureUrl,
          error_info: errorInfo,
        },
        { onConflict: 'episode_id,reported_by' }
      );

    if (error && error.code !== '23505') {
      console.warn('[DeadAudio] Report failed:', error.message);
    }
  } catch (err) {
    // Fire-and-forget — never block the user
    console.warn('[DeadAudio] Report error:', err);
  }
}
