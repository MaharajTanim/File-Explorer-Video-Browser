// Global variables
let allVideos = [];
let currentTheme = "light";

// Generates a thumbnail for a video file
async function generateThumbnail(videoFile) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    video.preload = "metadata";
    video.src = URL.createObjectURL(videoFile);

    video.onloadedmetadata = () => {
      // Seek to 1 second for the thumbnail
      video.currentTime = 1;
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg");
      resolve({
        thumbnail: dataUrl,
        duration: video.duration,
        resolution: `${video.videoWidth}x${video.videoHeight}`,
      });
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      resolve({
        thumbnail: "",
        duration: 0,
        resolution: "0x0",
      });
    };
  });
}

// Processes video files and generates their thumbnails and metadata
async function processVideos(files) {
  return Promise.all(
    files.map(async (video) => {
      const { thumbnail, duration, resolution } = await generateThumbnail(
        video.file
      );
      return {
        ...video,
        thumbnail,
        meta: {
          duration,
          resolution,
          created: video.file.lastModified,
          size: video.file.size,
        },
      };
    })
  );
}

// Formats video duration from seconds to MM:SS
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// Filters, sorts, and displays the videos
function updateDisplay() {
  const searchQuery = document.getElementById("search").value.toLowerCase();
  const sortBy = document.getElementById("sort").value;

  let filtered = allVideos.filter((video) =>
    video.file.name.toLowerCase().includes(searchQuery)
  );

  filtered.sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.file.name.localeCompare(b.file.name);
      case "date":
        return b.meta.created - a.meta.created;
      case "size":
        return b.meta.size - a.meta.size;
      default:
        return 0;
    }
  });

  displayVideos(filtered);
}

// Displays video cards in the container
async function displayVideos(videos) {
  const container = document.getElementById("videoContainer");
  container.innerHTML = "";

  videos.forEach((video) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <div class="video-thumbnail">
        <img src="${video.thumbnail}" alt="Thumbnail">
      </div>
      <div class="card-content">
        <div class="video-info">
          <h3>${video.file.name}</h3>
          <div class="video-meta">
            <span class="meta-item">⏱ ${formatDuration(
              video.meta.duration
            )}</span>
            <span class="meta-item">📐 ${video.meta.resolution}</span>
            <span class="meta-item">📦 ${(video.meta.size / 1024 / 1024).toFixed(
              2
            )}MB</span>
          </div>
        </div>
      </div>
    `;
    // When a video card is clicked, play the video in the modal
    card.addEventListener("click", () => playVideo(video.file));
    container.appendChild(card);
  });
}

// Opens the modal and plays the selected video file
function playVideo(file) {
  const videoModal = document.getElementById("videoModal");
  const videoPlayer = videoModal.querySelector("video");
  videoPlayer.src = URL.createObjectURL(file);
  videoModal.style.display = "flex";
}

// Close modal when clicking the close button or outside modal content
document.querySelector("#videoModal .close").addEventListener("click", () => {
  const videoModal = document.getElementById("videoModal");
  const videoPlayer = videoModal.querySelector("video");
  videoPlayer.pause();
  videoPlayer.src = "";
  videoModal.style.display = "none";
});

window.addEventListener("click", (event) => {
  const videoModal = document.getElementById("videoModal");
  if (event.target === videoModal) {
    const videoPlayer = videoModal.querySelector("video");
    videoPlayer.pause();
    videoPlayer.src = "";
    videoModal.style.display = "none";
  }
});

// Toggle between dark and light themes
document.getElementById("themeToggle").addEventListener("click", () => {
  currentTheme = currentTheme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
});

// Toggle between grid and list views
document.getElementById("viewToggle").addEventListener("click", () => {
  document.getElementById("videoContainer").classList.toggle("list-view");
});

// Update display when search input or sort option changes
document.getElementById("search").addEventListener("input", updateDisplay);
document.getElementById("sort").addEventListener("change", updateDisplay);

// Folder selection handler using the File System Access API
document.getElementById("selectFolder").addEventListener("click", async () => {
  try {
    const directoryHandle = await window.showDirectoryPicker();
    document.getElementById("loading").style.display = "flex";

    const files = await readDirectory(directoryHandle);
    allVideos = await processVideos(files);
    updateDisplay();

    document.getElementById("loading").style.display = "none";
  } catch (error) {
    console.error("Error accessing directory:", error);
    document.getElementById("loading").style.display = "none";
  }
});

// Reads the directory and returns an array of video file objects
async function readDirectory(directoryHandle) {
  const validExtensions = ["mp4", "mov", "avi", "mkv", "webm", "ogg", "flv", "wmv"];
  const files = [];

  for await (const entry of directoryHandle.values()) {
    if (entry.kind === "file") {
      const file = await entry.getFile();
      const extension = file.name.split(".").pop().toLowerCase();
      if (validExtensions.includes(extension)) {
        files.push({ file });
      }
    }
  }
  return files;
}
