import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

export const Screen = ({ children, scroll = true }: ScreenProps) => {
  if (!scroll) {
    return <View style={styles.container}>{children}</View>;
  }
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.container}>
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7f9"
  },
  scrollContent: {
    padding: 16,
    gap: 14
  }
});
