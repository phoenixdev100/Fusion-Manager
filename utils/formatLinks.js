export function formatYouTubeLink(acc) {
  if (acc.id && acc.id.startsWith('UC')) {
    return `https://www.youtube.com/channel/${acc.id}`;
  } else if (acc.name) {
    return `https://www.youtube.com/@${acc.name}`;
  }
  return null;
}

export function formatTikTokLink(acc) {
  if (acc.name) return `https://www.tiktok.com/@${acc.name}`;
  return null;
}
