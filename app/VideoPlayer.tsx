import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, TouchableWithoutFeedback   } from "react-native";
import { Video, ResizeMode } from "expo-av";
import axios from "axios";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Slider from "@react-native-community/slider"; // Seek bar
import { AntDesign, Feather } from "@expo/vector-icons"; // For like button icon

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Replace with your EC2 API or testing source
const API_BASE_URL = "https://pixabay.com/api/videos/?key=49483580-8e2568eca051455ec22fe35f2";

const VideoPlayerScreen = () => {
  const [videoUrls, setVideoUrls] = useState<{ url: string; width: number; height: number; title: string }[]>([]);
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false); // Track button interaction
  let controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  const [videoWidth, setVideoWidth] = useState(screenWidth);
  const [videoHeight, setVideoHeight] = useState(screenHeight);

  useEffect(() => {
    fetchVideo();
  }, []);

  const fetchVideo = async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      if (response.data.hits.length > 0) {
        const urls = response.data.hits.map((video: any) => ({
          url: video.videos.medium.url,
          width: video.videos.medium.width,
          height: video.videos.medium.height,
          title: video.tags || "Untitled Video", // Use video tags as title
          }));
        setVideoUrls(urls);
      }
    } catch (error) {
      console.error("Error fetching video:", error);
    }
  };

  useEffect(() => {
    if (videoUrls.length > 0) {
      const currentVideo = videoUrls[currentIndex];
      const videoAspectRatio = currentVideo.width / currentVideo.height;
      const screenAspectRatio = screenWidth / screenHeight;
  
      if (videoAspectRatio > screenAspectRatio) {
        // Landscape video: Fit width
        setVideoWidth(screenWidth);
        setVideoHeight(screenWidth / videoAspectRatio);
      } else {
        // Portrait video: Fit height
        setVideoHeight(screenHeight);
        setVideoWidth(screenHeight * videoAspectRatio);
      }
    }
  }, [videoUrls, currentIndex]);


  const toggleLike = () => {
    setLiked(!liked);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      videoRef.current?.pauseAsync();
    } else {
      videoRef.current?.playAsync();
    }
    setIsPlaying(!isPlaying);
  };


  useEffect(() => {
    const interval = setInterval(() => {
      videoRef.current?.getStatusAsync().then(status => {
        if (status?.isLoaded) {
          setVideoPosition(status.positionMillis);
          setVideoDuration(status.durationMillis || 0);
        }
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleSeek = (value: number) => {
    videoRef.current?.setPositionAsync(value);
  };

   // Handle swipe gestures
   const swipeGesture = Gesture.Pan()
  .onFinalize((event) => {
    if (event.translationY < -50) {
      setIsPlaying(true); // Because autoplay
      setCurrentIndex((prev) => prev + 1);
    } else if (event.translationY > 50) {
      setIsPlaying(true); // Because autoplay
      setCurrentIndex((prev) => prev - 1);
    }
  })
  .requireExternalGestureToFail(); // Ensures other gestures like tap still work

  const tapGesture = Gesture.Tap()
  .onStart(() => {
    if (!isInteracting) {
          setShowControls((prev) => !prev);
    }
  });

  return (
    <GestureDetector gesture={Gesture.Race(tapGesture, swipeGesture)}>
      <View style={styles.container}>
      {videoUrls.length > 0 && (
        <Video
          ref={videoRef}
          source={{ uri: videoUrls[currentIndex]?.url }}
          style={{ width: videoWidth, height: videoHeight }}
          useNativeControls={false} // Remove controls for true autoplay experience
          resizeMode={ResizeMode.CONTAIN} // Ensures NO CROPPING
          onReadyForDisplay={videoData => {
            videoData.srcElement.style.position = "initial"
          }}
          isLooping
          shouldPlay // Autoplay on load
          isMuted={isMuted} // Mute to allow autoplay
          onLoad={() => {
            if (videoRef.current) {
              videoRef.current.playAsync().catch((error) => {
                console.error("Autoplay onLoad failed:", error);
              });
            }
          }}
        />
      )}
      
      {/* Title Overlay */}
      {videoUrls.length > 0 && (
        <View style={styles.titleContainer}>
          <Text style={styles.videoTitle}>{videoUrls[currentIndex].title}</Text>
        </View>
      )}

      {/* Like Button */}
      <TouchableOpacity style={styles.likeButton} 
      onPress={toggleLike}
      onPressIn={() => setIsInteracting(true)}
      onPressOut={() => setIsInteracting(false)}
      >
        <AntDesign name={liked ? "heart" : "hearto"} size={32} color={liked ? "red" : "white"} />
      </TouchableOpacity>

      {/* Download Button */}
      <TouchableOpacity style={styles.downloadButton} 
      onPress={()=>{}}
      onPressIn={() => setIsInteracting(true)}
      onPressOut={() => setIsInteracting(false)}
      >
        <AntDesign name={"download"} size={32} color="white"/>
      </TouchableOpacity>

        {/* Media Controls (Only Show on Tap) */}
        {showControls && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.playPauseButton}
          onPress={togglePlayPause}
          onPressIn={() => setIsInteracting(true)}
          onPressOut={() => setIsInteracting(false)}
          >
            <Feather name={isPlaying ? "pause" : "play"} size={40} color="white" />
          </TouchableOpacity>
        </View>
        )}

        {/* Seek Bar (Only Show on Tap) */}
      {showControls && (
        <View style={styles.seekBarContainer}>
          <Slider
            style={styles.seekBar}
            minimumValue={0}
            maximumValue={videoDuration}
            value={videoPosition}
            minimumTrackTintColor="#ffffff"
            maximumTrackTintColor="gray"
            thumbTintColor="#fff"
            onValueChange={handleSeek}
          />
        </View>
      )}

    </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    ...StyleSheet.absoluteFillObject, // Makes it fullscreen
    width: screenWidth,
    height: screenHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
    padding: 10,
    borderRadius: 8,
  },
  videoTitle: {
    color: "#fff",
    fontSize: 18,
    textAlign: "left",
  },
  likeButton: {
    position: "absolute",
    bottom: 180,
    right: 20,
  },
  downloadButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
  },
  controlsContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }], // Center the button
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 50,
    padding: 10,
  },
  playPauseButton: {
    alignSelf: "center",
  },
  seekBarContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  seekBar: {
    width: "100%",
    height: 20,
  },
});

export default VideoPlayerScreen;