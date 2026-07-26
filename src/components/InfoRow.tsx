import { StyleSheet, Text, View } from "react-native";

type InfoRowProps = {
  label: string;
  value: string;
};

export const InfoRow = ({ label, value }: InfoRowProps) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    gap: 4
  },
  label: {
    color: "#5f6b76",
    fontSize: 13
  },
  value: {
    color: "#17212b",
    fontSize: 17,
    fontWeight: "700"
  }
});
