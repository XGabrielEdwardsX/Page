// js/youtube.js

export function setupYouTube() {
    const API_KEY = 'AIzaSyDBHq7R-6cr-2Q537URdPnZB2pksvIsPVQ';
    const CHANNEL_ID = 'UCVR_vHO_v8w75K0jMIt6leA';

    const API_URL = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=3&type=video`;

    async function obtenerUltimosVideos() {
        try {
            const response = await fetch(API_URL);
            const data = await response.json();
            mostrarVideos(data.items);
        } catch (error) {
            console.error('Error al obtener los videos de YouTube:', error);
        }
    }

    function mostrarVideos(videos) {
        const youtubeContainer = document.getElementById('youtube-container');
        youtubeContainer.innerHTML = '';

        videos.forEach(video => {
            const videoId = video.id.videoId;
            let videoTitle = video.snippet.title;
            videoTitle = videoTitle.replace(/#[^\s]+/g, '');

            const videoElement = `
                <div class="col-md-4 mb-4">
                    <div class="youtube-video">
                        <iframe width="100%" height="200" src="https://www.youtube.com/embed/${videoId}" frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen></iframe>
                        <h3>${videoTitle.trim()}</h3>
                    </div>
                </div>
            `;

            youtubeContainer.innerHTML += videoElement;
        });
    }

    // Ejecutar la función para obtener y mostrar los videos
    obtenerUltimosVideos();
}
