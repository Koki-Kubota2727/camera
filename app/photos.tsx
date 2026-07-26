import { Image } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { listPhotos } from "@/repositories/photoRepository";
import type { Photo } from "@/types/photo";

export default function PhotosScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);

  const load = useCallback(async () => {
    const nextPhotos = await listPhotos();
    setPhotos(nextPhotos);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch((error: unknown) => {
        console.error("Failed to load photos", error);
      });
    }, [load])
  );

  if (photos.length === 0) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>写真はまだありません</Text>
          <Text style={styles.emptyText}>撮影するとここに未同期写真として表示されます。</Text>
        </View>
      </Screen>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={photos}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Link href={{ pathname: "/photo/[id]", params: { id: item.id } }} style={styles.link}>
          <View style={styles.item}>
            <Image source={{ uri: item.localUri }} style={styles.thumbnail} />
            <View style={styles.itemBody}>
              <Text numberOfLines={2} style={styles.fileName}>
                {item.currentFileName}
              </Text>
              <Text style={styles.meta}>{item.targetFolderNameCache}</Text>
              <Text style={styles.meta}>{new Date(item.capturedAt).toLocaleString()}</Text>
              <Text style={styles.status}>{formatUploadStatus(item.uploadStatus)}</Text>
            </View>
          </View>
        </Link>
      )}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: "#f6f7f9"
  },
  listContent: {
    padding: 16,
    gap: 10
  },
  link: {
    width: "100%"
  },
  item: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d8dee5"
  },
  thumbnail: {
    width: 82,
    height: 82,
    borderRadius: 6,
    backgroundColor: "#d8dee5"
  },
  itemBody: {
    flex: 1,
    gap: 3
  },
  fileName: {
    color: "#17212b",
    fontSize: 15,
    fontWeight: "800"
  },
  meta: {
    color: "#5f6b76",
    fontSize: 12
  },
  status: {
    color: "#1b5f8f",
    fontSize: 12,
    fontWeight: "800"
  },
  empty: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 18,
    gap: 8
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#17212b"
  },
  emptyText: {
    color: "#52606d"
  }
});

const formatUploadStatus = (status: Photo["uploadStatus"]): string => {
  switch (status) {
    case "local":
    case "queued":
      return "未同期";
    case "uploading":
      return "アップロード中";
    case "uploaded":
      return "同期済み";
    case "failed":
      return "エラー";
    case "target_missing":
      return "保存先不明";
    case "deleted":
      return "削除済み";
  }
};
