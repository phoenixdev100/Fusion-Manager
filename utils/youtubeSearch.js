import config from '../config/config.json' with { type: 'json' };
import fetch from 'node-fetch';

const API_KEY = config.YOUTUBE_API_KEY;

async function getUploadsPlaylistId(channelId) {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const items = data.items;
  if (!items || items.length === 0) return null;
  return items[0].contentDetails.relatedPlaylists.uploads;
}

async function searchVideosInPlaylist(playlistId, keyword) {
  let pageToken = '';
  while (true) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    for (const item of data.items) {
      const title = item.snippet.title;
      if (title.toLowerCase().includes(keyword.toLowerCase())) {
        return {
          videoTitle: title,
          videoUrl: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
          channelTitle: item.snippet.channelTitle,
          channelUrl: `https://www.youtube.com/channel/${item.snippet.channelId}`,
          publishedAt: item.snippet.publishedAt
        };
      }
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return null;
}

export async function findFusionVideo(channelId) {
  const uploadsPlaylistId = await getUploadsPlaylistId(channelId);
  if (!uploadsPlaylistId) return null;
  return await searchVideosInPlaylist(uploadsPlaylistId, 'Fusion');
}
