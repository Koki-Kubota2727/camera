import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useAppStore } from "@/store/appStore";

type CameraRef = React.ElementRef<typeof CameraView>;

export default function CameraScreen() {
  if (Platform.OS === "web") {
    return <WebCameraScreen />;
  }

  return <NativeCameraScreen />;
}

function NativeCameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraRef | null>(null);
  const [taking, setTaking] = useState(false);
  const settings = useAppStore((state) => state.settings);

  const takePhoto = async (): Promise<void> => {
    if (!cameraRef.current) {
      return;
    }
    setTaking(true);
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.92 });
      if (!result?.uri) {
        throw new Error("撮影画像を取得できませんでした。");
      }
      router.push({ pathname: "/photo-review", params: { uri: result.uri } });
    } catch (error: unknown) {
      Alert.alert("撮影できません", error instanceof Error ? error.message : String(error));
    } finally {
      setTaking(false);
    }
  };

  if (!permission) {
    return (
      <Screen>
        <Text>カメラ権限を確認しています。</Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <View style={styles.permissionPanel}>
          <Text style={styles.permissionTitle}>カメラ権限が必要です</Text>
          <Text style={styles.permissionText}>
            実験写真をアプリ内に保存するため、カメラの使用を許可してください。
          </Text>
          <PrimaryButton label="カメラを許可" onPress={() => void requestPermission()} />
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} facing="back" style={styles.camera} />
      <View style={styles.topBar}>
        <Text style={styles.metaLabel}>保存先</Text>
        <Text numberOfLines={1} style={styles.metaValue}>
          {settings?.targetFolderName ?? "-"}
        </Text>
        <Text style={styles.code}>{settings?.photographerCode ?? "-"}</Text>
      </View>
      <View style={styles.bottomBar}>
        <PrimaryButton
          label="保存先変更"
          onPress={() => router.push("/settings")}
          variant="secondary"
        />
        <PrimaryButton
          disabled={taking}
          label={taking ? "撮影中" : "撮影"}
          onPress={() => void takePhoto()}
        />
      </View>
    </View>
  );
}

function WebCameraScreen() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const settings = useAppStore((state) => state.settings);

  const pushDebugLine = (line: string): void => {
    setDebugLines((lines) => [...lines, `${new Date().toLocaleTimeString()} ${line}`].slice(-12));
  };

  const stopCamera = (): void => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setReady(false);
  };

  const startCamera = async (debug = false): Promise<void> => {
    setErrorMessage(null);
    if (debug) {
      setDebugLines([]);
      pushDebugLine(`href=${window.location.href}`);
      pushDebugLine(`isSecureContext=${String(window.isSecureContext)}`);
      pushDebugLine(`mediaDevices=${String(Boolean(navigator.mediaDevices))}`);
      pushDebugLine(`getUserMedia=${String(Boolean(navigator.mediaDevices?.getUserMedia))}`);
      pushDebugLine(`videoElement=${String(Boolean(videoRef.current))}`);
    }
    try {
      if (!window.isSecureContext) {
        throw new Error("HTTPS環境ではありません。GitHub Pagesのhttps URLで開いてください。");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("このブラウザではカメラを利用できません。");
      }
      stopCamera();
      pushDebugLine("getUserMediaを呼び出します");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      pushDebugLine(`stream取得成功 tracks=${stream.getVideoTracks().length}`);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        pushDebugLine("video.playを呼び出します");
        await videoRef.current.play();
        pushDebugLine(
          `video再生成功 size=${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`
        );
        setReady(true);
      } else {
        throw new Error("video要素が見つかりません。");
      }
    } catch (error: unknown) {
      const message = formatCameraError(error);
      pushDebugLine(`ERROR ${getErrorName(error)}: ${message}`);
      setErrorMessage(`${getErrorName(error)}: ${message}`);
    }
  };

  const takePhoto = (): void => {
    if (!videoRef.current || !ready) {
      setErrorMessage("カメラの準備がまだ完了していません。");
      return;
    }
    setTaking(true);
    try {
      const video = videoRef.current;
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width <= 0 || height <= 0) {
        throw new Error("カメラ映像のサイズを取得できませんでした。");
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("撮影画像を作成できませんでした。");
      }
      context.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const photoKey = `web-photo-${Date.now()}`;
      sessionStorage.setItem(photoKey, dataUrl);
      stopCamera();
      router.push({ pathname: "/photo-review", params: { uri: `web-temp:${photoKey}` } });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setTaking(false);
    }
  };

  useEffect(() => {
    void startCamera();
    return stopCamera;
  }, []);

  return (
    <View style={styles.root}>
      {createVideoElement(videoRef)}
      <View style={styles.topBar}>
        <Text style={styles.metaLabel}>保存先</Text>
        <Text numberOfLines={1} style={styles.metaValue}>
          {settings?.targetFolderName ?? "-"}
        </Text>
        <Text style={styles.code}>{settings?.photographerCode ?? "-"}</Text>
      </View>
      {errorMessage ? (
        <View style={styles.webErrorPanel}>
          <Text style={styles.permissionTitle}>カメラを起動できません</Text>
          <Text style={styles.permissionText}>{errorMessage}</Text>
          <PrimaryButton label="もう一度許可する" onPress={() => void startCamera(true)} />
        </View>
      ) : null}
      {debugLines.length > 0 ? (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>カメラ診断</Text>
          {debugLines.map((line) => (
            <Text key={line} style={styles.debugText}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.bottomBar}>
        <PrimaryButton
          label="保存先変更"
          onPress={() => router.push("/settings")}
          variant="secondary"
        />
        <PrimaryButton
          disabled={taking || !ready}
          label={taking ? "撮影中" : ready ? "撮影" : "準備中"}
          onPress={takePhoto}
        />
        <PrimaryButton
          label="カメラ診断"
          onPress={() => void startCamera(true)}
          variant="secondary"
        />
      </View>
    </View>
  );
}

const createVideoElement = (ref: React.RefObject<HTMLVideoElement | null>) =>
  // React Native Web上でブラウザ標準のvideo要素を直接使う。
  // expo-cameraのWeb実装よりGitHub Pages上で安定して動く。
  // eslint-disable-next-line react/no-unknown-property
  <video ref={ref} autoPlay playsInline muted style={webVideoStyle} />;

const webVideoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  backgroundColor: "#000"
} as const;

const formatCameraError = (error: unknown): string => {
  if (!(error instanceof DOMException)) {
    return error instanceof Error ? error.message : String(error);
  }
  if (error.name === "NotAllowedError") {
    return "ブラウザでカメラ利用が拒否されています。アドレスバー付近の権限設定からカメラを許可してください。";
  }
  if (error.name === "NotFoundError") {
    return "利用できるカメラが見つかりません。";
  }
  if (error.name === "NotReadableError") {
    return "他のアプリがカメラを使用中の可能性があります。";
  }
  return error.message;
};

const getErrorName = (error: unknown): string => {
  if (error instanceof DOMException || error instanceof Error) {
    return error.name || "CameraError";
  }
  return "CameraError";
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000"
  },
  camera: {
    flex: 1
  },
  topBar: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(10, 16, 22, 0.78)",
    borderRadius: 8,
    padding: 12,
    gap: 4
  },
  metaLabel: {
    color: "#c6d2dd",
    fontSize: 12
  },
  metaValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800"
  },
  code: {
    color: "#e8edf2",
    fontSize: 13,
    fontWeight: "700"
  },
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    gap: 10
  },
  permissionPanel: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    gap: 12
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17212b"
  },
  permissionText: {
    color: "#52606d",
    lineHeight: 20
  },
  webErrorPanel: {
    position: "absolute",
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    gap: 12
  },
  debugPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 150,
    maxHeight: 220,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 8,
    padding: 12,
    gap: 4
  },
  debugTitle: {
    color: "#17212b",
    fontWeight: "800"
  },
  debugText: {
    color: "#25313d",
    fontSize: 12,
    lineHeight: 16
  }
});
