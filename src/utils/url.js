export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export const getUrlPreview = async (url) => {
  try {
    const apiKey = import.meta.env.VITE_LINKPREVIEW_API_KEY;
    if (!apiKey) {
      return null;
    }
    const response = await fetch(
      `https://api.linkpreview.net/?key=${apiKey}&q=${encodeURIComponent(url)}`
    );
    const data = await response.json();
    return {
      title: data.title,
      description: data.description,
      image: data.image,
      url: data.url,
    };
  } catch (error) {
    console.error('Error fetching URL preview:', error);
    return null;
  }
}; 