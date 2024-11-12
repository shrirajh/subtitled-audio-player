# Subtitled Audio Player

A sleek, modern web-based audio player with synchronized subtitle display. This player provides a beautiful, animated interface for playing audio files alongside their corresponding SRT subtitle files.

[Try it out here](https://shrirajh.github.io/subtitled-audio-player)

## Features

- 🎵 Clean, modern audio player interface
- 📝 Dynamic subtitle display with smooth animations
- 🎨 Beautiful gradient background with aurora effects
- 🔄 Smart subtitle synchronization
- ⌨️ Keyboard controls for navigation
- ⚡ Multiple playback speed options
- 🖥️ Responsive design that works on all devices
- 🎯 Speaker identification support
- 🔍 Optimized performance with requestAnimationFrame

## Usage

1. Open the [player website](https://shrirajh.github.io/subtitled-audio-player)
2. Select your audio file (supports all browser-compatible audio formats)
3. Select your SRT subtitle file
4. Use the player controls to play, pause, and navigate through the audio

### Generating Subtitles with WhisperX

The player works great with subtitles generated using [WhisperX](https://github.com/m-bain/whisperX), which provides high-quality transcription with speaker diarization.

To generate compatible subtitles:

1. Install WhisperX following instructions from their [repository](https://github.com/m-bain/whisperX)
2. Get a Hugging Face token from [huggingface.co](https://huggingface.co/settings/tokens)
3. Run WhisperX with the following command:

```bash
whisperx ^
    [PATH_TO_FILE} ^
    --hf_token [HF_TOKEN] ^
    --diarize ^
    --highlight_words True ^
    --model large-v2 ^
    --align_model WAV2VEC2_ASR_LARGE_LV60K_960H ^
    --batch_size 4 ^
    --language en
```

Replace:
- `[PATH_TO_FILE]` with the path to your audio file
- `[HF_TOKEN]` with your Hugging Face token

This will generate an SRT file with speaker labels that's perfectly compatible with the player.

### Keyboard Controls

- `←` / `→`: Skip backward/forward by 2.5 seconds
- `Shift + ←` / `Shift + →`: Jump to previous/next subtitle

### Playback Speed

You can adjust the playback speed using the speed control buttons:
- 1x (normal speed)
- 1.5x
- 2x
- 3x
- 4x

## Subtitle Format

The player supports standard SRT files with optional speaker labels. Speaker labels should be formatted as follows:

```
1
00:00:01,000 --> 00:00:04,000
[SPEAKER_1]: This is speaker one's text.

2
00:00:04,500 --> 00:00:07,500
[SPEAKER_2]: This is speaker two's text.
```

## Features in Detail

### Dynamic Subtitle Display
- Displays 5 lines of subtitles in a carousel format
- Active subtitle is highlighted and enlarged
- Smooth transitions between subtitle changes
- Adjacent subtitles are dimmed for better focus

### Performance Optimizations
- Uses requestAnimationFrame for smooth animations
- Efficient subtitle synchronization
- Optimized DOM updates
- Smart caching of subtitle groups

### Visual Design
- Animated gradient background
- Aurora effect with dynamic blur
- Glass-morphism design elements
- Responsive typography
- High-contrast text for readability

## Technical Notes

- Built with vanilla JavaScript and CSS
- No external dependencies required
- Uses modern web APIs for optimal performance
- Fully client-side (no server required)

## Browser Support

Works on all modern browsers that support:
- HTML5 Audio
- CSS Grid/Flexbox
- CSS Animations
- Modern JavaScript (ES6+)

## License

MIT License - feel free to use and modify as needed!

## Contributing

Feel free to open issues or submit pull requests for:
- Bug fixes
- New features
- Documentation improvements
- Visual enhancements

## Known Limitations

- SRT files must be in UTF-8 encoding
- Large SRT files may take a moment to parse
- Audio formats are limited to browser-supported codecs
