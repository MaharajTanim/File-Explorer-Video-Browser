const videoExtensions = [
    'mp4', 'webm', 'ogg', 'mov',
    'avi', 'mkv', 'flv', 'wmv',
    'm4v', '3gp', 'mpeg', 'mpg'
];

async function readDirectory(directoryHandle) {
    const files = [];
    for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'directory') {
            const subFiles = await readDirectory(entry);
            files.push(...subFiles);
        } else {
            const file = await entry.getFile();
            const ext = file.name.split('.').pop().toLowerCase();
            
            if (file.type.startsWith('video/') || videoExtensions.includes(ext)) {
                files.push({ file, handle: entry });
            }
        }
    }
    return files;
}

async function displayVideos(videos) {
    const container = document.getElementById('videoContainer');
    container.innerHTML = '';

    videos.forEach((video, index) => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <div class="video-thumbnail"></div>
            <div class="card-content">
                <div class="video-info">
                    <h3>${video.file.name}</h3>
                    <div class="video-details">
                        <span>${video.file.type}</span>
                        <span>${(video.file.size / 1024 / 1024).toFixed(2)}MB</span>
                    </div>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => playVideo(video.file));
        container.appendChild(card);
    });
}

function playVideo(file) {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('modalVideo');
    const url = URL.createObjectURL(file);
    
    video.src = url;
    modal.classList.add('active');
    video.play().catch(error => console.log('Video play error:', error));
}

function closeModal() {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('modalVideo');
    
    video.pause();
    video.src = '';
    modal.classList.remove('active');
    URL.revokeObjectURL(video.src);
}

document.getElementById('selectFolder').addEventListener('click', async () => {
    try {
        const directoryHandle = await window.showDirectoryPicker();
        document.getElementById('loading').style.display = 'block';
        
        const videos = await readDirectory(directoryHandle);
        await displayVideos(videos);
        
        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        console.error('Error accessing directory:', error);
        document.getElementById('loading').style.display = 'none';
    }
});

window.onclick = function(event) {
    const modal = document.getElementById('videoModal');
    if (event.target === modal) {
        closeModal();
    }
};