import { Pressable, StyleSheet, Text } from "react-native";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

export const PrimaryButton = ({
  label,
  onPress,
  variant = "primary",
  disabled = false
}: PrimaryButtonProps) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      styles[variant],
      disabled ? styles.disabled : null,
      pressed && !disabled ? styles.pressed : null
    ]}
  >
    <Text style={[styles.label, variant === "secondary" ? styles.secondaryLabel : null]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primary: {
    backgroundColor: "#1b5f8f"
  },
  secondary: {
    backgroundColor: "#e8edf2"
  },
  danger: {
    backgroundColor: "#b3261e"
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    opacity: 0.8
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  secondaryLabel: {
    color: "#1b2632"
  }
});
