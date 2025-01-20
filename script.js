let filesSelected = { media: false, audio: false, video: false, srt: false };

class SubtitleParser {
    static parseSRT(srtContent) {
        const subtitles = [];
        const segments = srtContent.trim().replace(/\r/g, "").split("\n\n");

        for (const segment of segments) {
            const lines = segment.split("\n");
            if (lines.length < 3) continue;

            const timeString = lines[1];
            const [start, end] = timeString.split(" --> ").map(
                this.timeToSeconds,
            );
            const text = lines.slice(2).join("\n");

            const speakerMatch = text.match(/\[(SPEAKER_\d+)\]:\s*(.*)/);
            let speaker = "", content = text;

            if (speakerMatch) {
                speaker = "S" + speakerMatch[1].match(/SPEAKER_(\d+)/)[1];
                content = speakerMatch[2].trim();
            }

            const plainText = this.stripHtml(content);

            subtitles.push({
                start,
                end,
                speaker,
                text: content,
                plainText,
            });
        }

        return subtitles;
    }

    static stripHtml(html) {
        const temp = document.createElement("div");
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || "";
    }

    static timeToSeconds(timeString) {
        const [time, ms] = timeString.split(",");
        const [hours, minutes, seconds] = time.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
    }
}

class SubtitleCarousel {
    constructor(container, subtitles) {
        this.container = container;
        this.subtitles = subtitles;
        this.currentLines = [];
        this.currentLinesObjects = [];
        this.currentIndex = -1;
        this.currentPlainText = "";
        this.uniqueSubtitleGroups = this.generateUniqueSubtitleGroups(
            subtitles,
        );
        this.initialize();
    }

    get lineHeight() {
        return this.container.clientHeight / 5;
    }

    generateUniqueSubtitleGroups(subtitles) {
        const groups = [];
        let lastSubtitle;

        for (const subtitle of subtitles) {
            if (
                !groups.length || !lastSubtitle ||
                lastSubtitle.plainText !== subtitle.plainText
            ) {
                groups.push({
                    plainText: subtitle.plainText,
                    timeStampStart: subtitle.start,
                    subtitles: [],
                });
            }

            const lastGroup = groups[groups.length - 1];
            lastGroup.subtitles.push(subtitle);
            lastGroup.timeStampStart = Math.min(
                lastGroup.timeStampStart,
                subtitle.start,
            );

            lastSubtitle = subtitle;
        }

        return groups.map((group, index) => ({
            ...group,
            index,
        }));
    }

    getUniqueGroupIndex(currentSubtitle) {
        const matchingGroups = this.uniqueSubtitleGroups.filter(
            (group) => group.plainText === currentSubtitle.plainText,
        );

        if (matchingGroups.length === 0) {
            return -1;
        }

        const closestMatch = matchingGroups.sort(
            (a, b) =>
                Math.abs(a.timeStampStart - currentSubtitle.start) -
                Math.abs(b.timeStampStart - currentSubtitle.start),
        )[0];

        return this.uniqueSubtitleGroups.indexOf(closestMatch);
    }

    getAdjacentGroups(currentGroupIndex, offset = 0) {
        const groups = [];
        // Get previous 2 groups
        for (let i = 2; i > 0; i--) {
            const index = currentGroupIndex - i + offset;
            if (index >= 0) {
                groups.push(this.uniqueSubtitleGroups[index]);
            } else {
                // Push empty group for positions before the start
                groups.push(null);
            }
        }

        // Add current group
        const currentIndex = currentGroupIndex + offset;
        if (
            currentIndex >= 0 && currentIndex < this.uniqueSubtitleGroups.length
        ) {
            groups.push(this.uniqueSubtitleGroups[currentIndex]);
        }

        // Get next 2 groups
        for (let i = 1; i <= 2; i++) {
            const index = currentGroupIndex + i + offset;
            if (index < this.uniqueSubtitleGroups.length) {
                groups.push(this.uniqueSubtitleGroups[index]);
            }
        }

        return groups;
    }

    initialize() {
        for (let i = 0; i < 5; i++) {
            const line = document.createElement("div");
            line.className = "subtitle-line";
            line.style.translate = `0px ${this.getLinePosition(i)}px`;
            this.updateLineStyle(line, i);
            this.container.appendChild(line);
            this.currentLines.push(line);
        }
    }

    updateLineStyle(line, index) {
        line.classList.remove("active", "adjacent", "outer");

        if (index === 2) {
            line.classList.add("active");
        } else if (index === 1 || index === 3) {
            line.classList.add("adjacent");
        } else {
            line.classList.add("outer");
        }
    }

    getLinePosition(index) {
        return index * this.lineHeight;
    }

    createSubtitleElement(subtitle) {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";
        container.setAttribute("data-subtitleData", JSON.stringify(subtitle));

        const contentWrapper = document.createElement("div");
        contentWrapper.className = "subtitle-content";

        if (subtitle.speaker) {
            const speakerLabel = document.createElement("span");
            speakerLabel.className = "speaker-label";
            speakerLabel.textContent = `[${subtitle.speaker}]:`;
            contentWrapper.appendChild(speakerLabel);
        }

        const textContent = document.createElement("span");
        textContent.innerHTML = subtitle.text;
        contentWrapper.appendChild(textContent);

        container.appendChild(contentWrapper);

        // Add ResizeObserver to check and adjust text size
        this.observeTextSize(container, contentWrapper);

        return container;
    }

    observeTextSize(container, contentWrapper) {
        const observer = new ResizeObserver(() => {
            this.adjustTextSize(container, contentWrapper);
        });

        observer.observe(container);

        // Initial size adjustment
        setTimeout(() => {
            this.adjustTextSize(container, contentWrapper);
        }, 0);
    }

    adjustTextSize(container, contentWrapper) {
        function getScale(element) {
            return parseFloat(
                (element.style.fontSize || "1em").replace(/[^0-9\.]/g, ""),
            );
        }

        function setScale(element, scale) {
            if (scale !== null) {
                element.style.fontSize = `${scale}em`;
            } else {
                element.style.fontSize = "";
            }
        }

        // Reset transform to measure true height
        setScale(contentWrapper, 1);

        while (true) {
            const containerHeight =
                container.parentElement?.parentElement?.offsetHeight ??
                    container.offsetHeight;
            const contentHeight = contentWrapper.offsetHeight;

            if (contentHeight > containerHeight) {
                // const scale = containerHeight / contentHeight;
                const scale = getScale(contentWrapper) - 0.05;
                // Limit minimum scale to 0.5 (50% of original size)
                const finalScale = Math.max(scale, 0.5);
                setScale(contentWrapper, finalScale);

                if (finalScale === 0.5) break;
            } else {
                break;
            }
        }
    }

    updateActiveLineContent(subtitle) {
        const activeLine = this.currentLines[2];
        if (activeLine) {
            activeLine.innerHTML = "";
            const subtitleElement = this.createSubtitleElement(subtitle);
            activeLine.appendChild(subtitleElement);
            this.adjustTextSize(subtitleElement, subtitleElement.firstChild);
        }
    }

    updateSubtitle(currentTime) {
        const currentSubtitle = this.subtitles.find(
            (sub) => currentTime >= sub.start && currentTime <= sub.end,
        );

        if (currentSubtitle) {
            const currentGroupIndex = this.getUniqueGroupIndex(currentSubtitle);

            if (currentGroupIndex !== this.currentIndex) {
                this.currentIndex = currentGroupIndex;
                this.currentPlainText = currentSubtitle.plainText;
                this.advanceCarousel(currentGroupIndex);
            } else {
                this.updateActiveLineContent(currentSubtitle);
            }
        }
    }

    advanceCarousel(currentGroupIndex) {
        function setTranslateY(element, scale) {
            element.style.translate = "0px " + scale;
        }

        // Remove the top line with animation
        const topLine = this.currentLines.shift();
        topLine.classList.add("hidden-top");
        setTimeout(() => topLine.remove(), 500);

        // Move existing lines up
        this.currentLines.forEach((line, index) => {
            setTranslateY(line, `${this.getLinePosition(index)}px`);
            this.updateLineStyle(line, index);
        });

        // Create new line at the bottom
        const newLine = document.createElement("div");
        newLine.className = "subtitle-line hidden-bottom outer";

        // Get the content for the new line
        const futureGroups = this.getAdjacentGroups(currentGroupIndex);
        if (futureGroups[4]) { // If we have a future group for this position
            const subtitleElement = this.createSubtitleElement(
                futureGroups[4].subtitles[0],
            );
            newLine.appendChild(subtitleElement);
        }

        setTranslateY(newLine, `${this.getLinePosition(4)}px`);
        this.container.appendChild(newLine);

        // Trigger reflow
        newLine.offsetHeight;

        // Show the new line
        newLine.classList.remove("hidden-bottom");
        this.currentLines.push(newLine);

        // Update all line contents with logic to clear future subtitles above active line
        const groups = this.getAdjacentGroups(currentGroupIndex);
        this.currentLines.forEach((line, index) => {
            line.innerHTML = "";

            if (index < groups.length) {
                // Only show content for lines at or below the active line (index >= 2)
                // or for previous content (groups[index] time < current time)
                if (
                    index >= 2 ||
                    (groups[index] &&
                        groups[index].subtitles[0].end <=
                            groups[2].subtitles[0].start)
                ) {
                    if (groups[index]) {
                        const subtitleElement = this.createSubtitleElement(
                            groups[index].subtitles[0],
                        );
                        line.appendChild(subtitleElement);
                    }
                }
            }
        });
    }
}

class TitleManager {
    constructor() {
        this.audioTitle = "";
        this.currentSubtitle = "";
        this.isPlaying = false;
    }

    async setAudioTitle(file) {
        // First try to get metadata from the audio file
        try {
            const metadata = await this.getAudioMetadata(file);
            if (metadata && metadata.title) {
                this.audioTitle = metadata.title.substring(0, 10);
            } else {
                // Fallback to filename if no metadata title
                this.audioTitle = file.name.split(".")[0].substring(0, 10);
            }
        } catch (error) {
            console.warn("Could not extract metadata:", error);
            this.audioTitle = file.name.split(".")[0].substring(0, 10);
        }
        this.updateTitle();
    }

    async getAudioMetadata(file) {
        return new Promise((resolve) => {
            if (filesSelected.video) return resolve(null);

            const audio = new Audio();
            const url = URL.createObjectURL(file);

            const handleMetadata = () => {
                const metadata = {
                    title: audio.title || null,
                    artist: audio.artist || null,
                    album: audio.album || null,
                };

                URL.revokeObjectURL(url);
                audio.removeEventListener("loadedmetadata", handleMetadata);
                audio.removeEventListener("error", handleError);
                resolve(metadata);
            };

            const handleError = () => {
                URL.revokeObjectURL(url);
                audio.removeEventListener("loadedmetadata", handleMetadata);
                audio.removeEventListener("error", handleError);
                resolve(null);
            };

            audio.addEventListener("loadedmetadata", handleMetadata);
            audio.addEventListener("error", handleError);
            audio.src = url;
        });
    }

    setCurrentSubtitle(subtitle) {
        if (subtitle) {
            const plainText = subtitle.plainText || subtitle;
            this.currentSubtitle = plainText;
            this.updateTitle();
        }
    }

    setPlayState(isPlaying) {
        this.isPlaying = isPlaying;
        this.updateTitle();
    }

    updateTitle() {
        const playIcon = this.isPlaying ? "▶" : "⏸";
        document.title =
            `${playIcon} | ${this.audioTitle} | ${this.currentSubtitle}`;
    }
}

let subtitleCarousel;
const audioPlayer = document.getElementById("audioPlayer");
const videoPlayer = document.getElementById("videoPlayer");
const fileInputs = document.getElementById("fileInputs");
const speedControl = document.getElementById("speedControl");
let animationFrameId = null;
const titleManager = new TitleManager();

function currentPlayer() {
    if (filesSelected.video) return videoPlayer;
    return audioPlayer;
}

// New keyboard control functions
function findNextSubtitleTime(currentTime, direction) {
    let subtitles = subtitleCarousel.subtitles;
    if (direction === "forward") {
        const nextLine = JSON.parse(
            subtitleCarousel.currentLines[3]?.firstChild?.getAttribute(
                "data-subtitleData",
            ) ?? "undefined",
        );
        if (nextLine) {
            return nextLine.start;
        }

        return subtitles.find((sub) => sub.start > currentTime)?.start;
    } else {
        const prevLine = JSON.parse(
            subtitleCarousel.currentLines[1]?.firstChild?.getAttribute(
                "data-subtitleData",
            ) ?? "undefined",
        );
        if (prevLine) {
            return prevLine.start;
        }

        return subtitles.reverse().find((sub) => sub.start < currentTime)
            ?.start;
    }
}

function handleKeyboardControls(e) {
    if (!audioPlayer.src && !videoPlayer.src) return; // Don't handle keyboard events if no media is loaded

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault(); // Prevent default scrolling behavior

        if (e.shiftKey) {
            // Jump to next/previous subtitle
            const direction = e.key === "ArrowRight" ? "forward" : "backward";
            const nextTime = findNextSubtitleTime(
                currentPlayer().currentTime,
                direction,
            );
            if (nextTime !== undefined) {
                currentPlayer().currentTime = nextTime;
            }
        } else {
            // Jump 2.5 seconds
            const offset = e.key === "ArrowRight" ? 2.5 : -2.5;
            currentPlayer().currentTime = Math.max(
                0,
                currentPlayer().currentTime + offset,
            );
        }
    } else if (e.code === "Space") {
        e.preventDefault();
        if (currentPlayer().paused) {
            currentPlayer().play();
        } else {
            currentPlayer().pause();
        }
    } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
    }
}

// Fullscreen functionality
const container = document.getElementById("fullscreen-container");
const fullscreenButton = document.getElementById("fullscreenButton");

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch((err) => {
            console.error(
                `Error attempting to enable fullscreen: ${err.message}`,
            );
        });
    } else {
        document.exitFullscreen();
    }
}

document.addEventListener("fullscreenchange", () => {
    container.classList.toggle(
        "fullscreen",
        document.fullscreenElement !== null,
    );
    fullscreenButton.textContent = document.fullscreenElement ? "⛶" : "⛶";
});

fullscreenButton.addEventListener("click", toggleFullscreen);

// Add keyboard event listener
document.addEventListener("keydown", handleKeyboardControls);

// Speed control handling
speedControl.addEventListener("click", (e) => {
    if (e.target.classList.contains("speed-button")) {
        const speed = parseFloat(e.target.dataset.speed);
        currentPlayer().playbackRate = speed;

        // Update active button
        speedControl.querySelectorAll(".speed-button").forEach((btn) => {
            btn.classList.toggle("active", btn === e.target);
        });
    }
});

// Modified file input handler for media
document.getElementById("mediaFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const isVideo = file.type.startsWith("video/");

        // Show/hide appropriate player
        if (isVideo) {
            videoPlayer.classList.add("active");
            audioPlayer.classList.remove("active");
            container.classList.add("video-active");
            container.classList.remove("audio-active");
        } else {
            audioPlayer.classList.add("active");
            videoPlayer.classList.remove("active");
            container.classList.add("audio-active");
            container.classList.remove("video-active");
        }

        // Set the source
        filesSelected.media = true;
        filesSelected.audio = !isVideo;
        filesSelected.video = isVideo;
        if (isVideo) {
            videoPlayer.src = url;
        } else {
            audioPlayer.src = url;
        }

        await titleManager.setAudioTitle(file);
        checkHideInputs();
    }
});

document.getElementById("srtFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const subtitles = SubtitleParser.parseSRT(e.target.result);
            subtitleCarousel = new SubtitleCarousel(
                document.getElementById("subtitleCarousel"),
                subtitles,
            );
            filesSelected.srt = true;
            checkHideInputs();
        };
        reader.readAsText(file);
    }
});

function checkHideInputs() {
    if (filesSelected.media && filesSelected.srt) {
        fileInputs.classList.add("hidden");
    }
}

// Improved performance for subtitle updates using requestAnimationFrame
function updateSubtitles() {
    if (subtitleCarousel) {
        const currentTime = currentPlayer().currentTime;
        subtitleCarousel.updateSubtitle(currentTime);

        // Update title with current subtitle
        const currentSubtitle = subtitleCarousel.subtitles.find(
            (sub) => currentTime >= sub.start && currentTime <= sub.end,
        );
        if (currentSubtitle) {
            titleManager.setCurrentSubtitle(currentSubtitle);
        }
    }
    animationFrameId = requestAnimationFrame(updateSubtitles);
}

videoPlayer.addEventListener("play", () => {
    titleManager.setPlayState(true);
    // Start updating subtitles when audio plays
    animationFrameId = requestAnimationFrame(updateSubtitles);
});

videoPlayer.addEventListener("pause", () => {
    titleManager.setPlayState(false);
    // Stop updating subtitles when audio is paused
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
});

videoPlayer.addEventListener("timeupdate", () => {
    if (subtitleCarousel) {
        subtitleCarousel.updateSubtitle(videoPlayer.currentTime);
    }
});

audioPlayer.addEventListener("play", () => {
    titleManager.setPlayState(true);
    // Start updating subtitles when audio plays
    animationFrameId = requestAnimationFrame(updateSubtitles);
});

audioPlayer.addEventListener("pause", () => {
    titleManager.setPlayState(false);
    // Stop updating subtitles when audio is paused
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
});

audioPlayer.addEventListener("timeupdate", () => {
    if (subtitleCarousel) {
        subtitleCarousel.updateSubtitle(audioPlayer.currentTime);
    }
});

// Clean up on page unload
window.addEventListener("unload", () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
});
