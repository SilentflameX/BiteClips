import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator   } from "react-native";
import { Video, ResizeMode } from "expo-av";
import axios from "axios";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Slider from "@react-native-community/slider"; // Seek bar
import { AntDesign, Feather } from "@expo/vector-icons"; // For like button icon
import { useAuth } from './AuthContext';
import { post } from "@aws-amplify/api";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Replace with your EC2 API or testing source
const API_BASE_URL = "https://pixabay.com/api/videos/?key=49483580-8e2568eca051455ec22fe35f2";

const SIGN_API_URL = "https://lmuf8j01sg.execute-api.ap-southeast-2.amazonaws.com/Stage/get-signed-url";


const LIKE_API_URL = "https://lmuf8j01sg.execute-api.ap-southeast-2.amazonaws.com/Stage/get-likes";
const GET_LIKE_API_URL = "https://lmuf8j01sg.execute-api.ap-southeast-2.amazonaws.com/Stage/get-likes";


// Function to extract title from URL
const getTitleFromUrl = (url: string) => {
  const urlObj = new URL(url);
  const fileName = urlObj.pathname.split('/').pop();
  return fileName ? fileName.replace(/\.[^/.]+$/, "") : "Untitled Video";  // Remove file extension
};


const VideoPlayerScreen = () => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [likedVideos, setLikedVideos] = useState<string[]>([]);
  const [liked, setLiked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false); // Track button interaction
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [currentVideoUrl, setcurrentVideoUrl] = useState<string>("");

  
  const [videoWidth, setVideoWidth] = useState(screenWidth);
  const [videoHeight, setVideoHeight] = useState(screenHeight);

  const [videos, setVideos] = useState<{ url: string; title: string }[]>([]);
  const { authTokens, user } = useAuth();  // Access authTokens from AuthContext
  const [isLoading, setIsLoading] = useState(true);  // To show loading state

  // Always call the effect, but use the condition inside the effect
  useEffect(() => {
    // Only update loading state if authTokens is available
    if (authTokens) {
      setIsLoading(false);  // Set loading to false once token is available
      fetchLikedVideos(); //Set Liked videos
    }
  }, [authTokens]);  // Depend on authTokens to trigger effect when it changes

  
  //Get signed urls
  useEffect(() => {
    if (authTokens) {
    async function fetchSignedUrl() {
      console.log(`Signing using: ${authTokens}`)
      const response = await fetch(`${SIGN_API_URL}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authTokens}` },
      });

      const data = await response.json();
      console.log(data);
      console.log(`Signed: ${data.signedUrls} from ${authTokens}`)

      const videoData = data.signedUrls.map((url: string) => {
        // Extract the title from the URL
        const title = getTitleFromUrl(url);  // Call the function to extract title from URL
        return { url, title };
      });

      setIsPlaying(true); // Because autoplay
      setVideos(videoData);
      setVideoTitle(videoData[0].title);
      setcurrentVideoUrl(videoData[0].url);
      //Split file name from url
      console.log(data.signedUrl);
    }

      fetchSignedUrl();
    }
  }, [authTokens]);

  //Post like
  const sendLike = async (likedVideoName: string) => {
    try {
      // Ensure the user is authenticated and has the auth token
      if (!authTokens) {
        console.error('No auth token found!');
        return;
      }
  
      // Prepare the data to send (an array of video IDs in this case)
      const requestBody = {
        userId: user,  // Array of video IDs that the user liked
        videoId: likedVideoName,
      };
  
      const response = await fetch(`${LIKE_API_URL}`, {
        method: 'POST',  // POST method to send data
        headers: {
          //'Content-Type': 'application/json',  // Send data as JSON
          Authorization: `Bearer ${authTokens}`,  // Include the auth token in the header
        },
        body: JSON.stringify(requestBody),  // Convert the request body to a JSON string
      });
  
      if (!response.ok) {
        throw new Error(`Error sending liked videos: ${response.statusText}`);
      }
  
      const responseData = await response.json();  // Parse the JSON response
      console.log('Liked videos saved:', responseData);
      // Add to our likedList
      setLikedVideos([...likedVideos, likedVideoName])
      // You can handle the response here (e.g., show a success message)
    } catch (error) {
      console.error('Error:', error);
    }
  };

  //Get like
  const fetchLikedVideos = async () => {
    try {
      const response = await fetch(`${GET_LIKE_API_URL}?userId=${user}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authTokens}` },
      });
      const data = await response.json();
      setLikedVideos(data.likedVideos.map((video) => video.VideoID)); 
      console.log("Liked Videos:", data.likedVideos);
    } catch (error) {
      console.error("Error fetching liked videos:", error);
    }
  };

  useEffect(() => {
    // Check if the current video is in the liked videos list
    setLiked(likedVideos.includes(videoTitle));
  }, [likedVideos, videoTitle]);

  const toggleLike = () => {
    if(!liked){
      sendLike(videoTitle)
    }
    else{
    }
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
      setCurrentIndex((prev) => {
        // Increment current index, but make sure it doesn't exceed the video list length
        const nextIndex = prev + 1;
        return nextIndex < videos.length ? nextIndex : prev;
      });
      setVideoTitle(videos[currentIndex].title);
      setcurrentVideoUrl(videos[currentIndex].url);
    } else if (event.translationY > 50) {
      setIsPlaying(true); // Because autoplay
      setCurrentIndex((prev) => {
        // Decrement current index, but make sure it doesn't go below 0
        const prevIndex = prev - 1;
        return prevIndex >= 0 ? prevIndex : 0; // Prevent index from going below 0
      });
      setVideoTitle(videos[currentIndex].title);
      setcurrentVideoUrl(videos[currentIndex].url);
    }
  })
  .requireExternalGestureToFail(); // Ensures other gestures like tap still work

  const tapGesture = Gesture.Tap()
  .onStart(() => {
    if (!isInteracting) {
          setShowControls((prev) => !prev);
    }
  });

  // If the tokens are not available, render loading state
  if (isLoading) {
    return null;
    //return (
    //  <View style={styles.container}>
    //    <ActivityIndicator size="large" color="#3498db" />  {/* Loading spinner */}
    //    <Text style={styles.videoTitle}>Loading...</Text>
    //  </View>
    //);
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(currentVideoUrl, { method: "GET" });
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "video.mp4"; // Custom filename
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <GestureDetector gesture={Gesture.Race(tapGesture, swipeGesture)}>
      <View style={styles.container}>
      {videos.length > 0 && (
        <Video
          ref={videoRef}
          source={{ uri: currentVideoUrl}}
          style={[styles.video, { width: videoWidth, height: videoHeight }]}
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
      {videos.length > 0 && (
        <View style={styles.titleContainer}>
          <Text style={styles.videoTitle}>{videoTitle}</Text>
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
      onPress={handleDownload}
      onPressIn={() => setIsInteracting(true)}
      onPressOut={() => {setIsInteracting(false)}}>
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
    width: screenWidth,
    height: screenHeight,
    justifyContent: "center",
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