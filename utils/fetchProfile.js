import fetch from 'node-fetch';

export async function fetchProfile(userId) {
  try {
    const res = await fetch(`https://dcdn.nostep.xyz/profile/${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
