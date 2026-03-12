export const extractYoutubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/embed\/)([^?&#]+)/,
    /(?:v=|youtu\.be\/)([^&\s?#]+)/,
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[match.length > 2 ? 2 : 1] || null;
  }
  return null;
};

export const isYoutubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

export const buildYoutubeEmbed = (videoId: string) => {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=1&autoplay=1`;
};

export const YoutubePlayer = ({ videoId }: { videoId: string }) => {
  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <iframe
        src={buildYoutubeEmbed(videoId)}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        frameBorder="0"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups-to-escape-sandbox"
      />
      <div
        className="absolute top-0 left-0 right-0 z-20"
        style={{
          height: '55px',
          background: 'transparent',
          pointerEvents: 'all',
          cursor: 'default',
        }}
      />
    </div>
  );
};
