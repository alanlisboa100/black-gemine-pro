import React, {useEffect, useMemo, useRef, useState} from "react";
import {Animated, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View} from "react-native";

const h = React.createElement;

function Action({label, onPress, primary = false}) {
  return h(Pressable, {accessibilityRole: "button", accessibilityLabel: label, onPress, style: [styles.action, primary && styles.actionPrimary]}, h(Text, {style: [styles.actionText, primary && styles.actionPrimaryText]}, label));
}

export default function App() {
  const spin = useRef(new Animated.Value(0)).current;
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(7);
  const [paused, setPaused] = useState(false);
  const rotate = useMemo(() => spin.interpolate({inputRange: [0, 1], outputRange: ["0deg", "360deg"]}), [spin]);

  useEffect(() => {
    if (paused) { spin.stopAnimation(); return undefined; }
    const animation = Animated.loop(Animated.timing(spin, {toValue: 1, duration: 4400, useNativeDriver: true}));
    animation.start();
    return () => animation.stop();
  }, [paused, spin]);

  const burst = () => setHearts(current => Math.min(28, current + 6));
  return h(SafeAreaView, {style: styles.page},
    h(StatusBar, {barStyle: "light-content"}),
    h(View, {style: styles.header}, h(Text, {style: styles.brand}, "BLACKCORE"), h(Text, {style: styles.caption}, "CREATIVE LAB / MOBILE")),
    h(View, {style: styles.hero}, h(Text, {style: styles.kicker}, "APK-READY EXPO FIXTURE"), h(Text, {style: styles.title}, "One small mobile lab."), h(Text, {style: styles.copy}, "A native counterpart to the local Canvas demo: motion, hearts and a tiny tap game.")),
    h(View, {style: styles.card},
      h(Text, {style: styles.cardTitle}, "3D core"),
      h(View, {style: styles.cubeStage}, h(Animated.View, {style: [styles.cube, {transform: [{rotateY: rotate}, {rotateX: "-18deg"}]}]}, h(Text, {style: styles.cubeText}, "BC"))),
      h(Action, {label: paused ? "Resume motion" : "Pause motion", onPress: () => setPaused(value => !value)})
    ),
    h(View, {style: styles.card},
      h(View, {style: styles.row}, h(Text, {style: styles.cardTitle}, "Heart pulse"), h(Action, {label: "Burst hearts", onPress: burst})),
      h(View, {style: styles.hearts}, Array.from({length: hearts}, (_, index) => h(Text, {key: index, style: [styles.heart, {opacity: .42 + (index % 4) * .14, transform: [{translateY: (index % 3) * 5}]}]}, "♥")))
    ),
    h(View, {style: [styles.card, styles.gameCard]},
      h(Text, {style: styles.cardTitle}, "Core Catch"),
      h(Text, {style: styles.score}, `Score ${score}`),
      h(Text, {style: styles.copy}, "Tap the core before it drops."),
      h(Pressable, {accessibilityRole: "button", accessibilityLabel: "Catch core", onPress: () => setScore(value => value + 10), style: styles.coreButton}, h(Text, {style: styles.coreText}, "♥")),
      h(Action, {label: "Reset score", onPress: () => setScore(0), primary: true})
    )
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, paddingHorizontal: 20, backgroundColor: "#09090f"},
  header: {flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: "#282838"},
  brand: {color: "#f6f4ff", fontSize: 15, fontWeight: "900", letterSpacing: 2}, caption: {color: "#a9a6c1", fontSize: 10, letterSpacing: 1.2},
  hero: {paddingVertical: 28}, kicker: {color: "#5eead4", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 9}, title: {color: "#f6f4ff", fontSize: 38, lineHeight: 40, fontWeight: "900", letterSpacing: -1.7, marginBottom: 10}, copy: {color: "#b0aec5", fontSize: 14, lineHeight: 21},
  card: {padding: 17, marginBottom: 13, borderWidth: 1, borderColor: "#2b2b40", borderRadius: 18, backgroundColor: "#171829"}, cardTitle: {color: "#f6f4ff", fontSize: 18, fontWeight: "800"}, cubeStage: {height: 136, alignItems: "center", justifyContent: "center"}, cube: {height: 83, width: 83, alignItems: "center", justifyContent: "center", borderRadius: 13, borderWidth: 1, borderColor: "#d7fff8", backgroundColor: "#7c3aed", shadowColor: "#a78bfa", shadowOpacity: .65, shadowRadius: 21, elevation: 10}, cubeText: {color: "#f6f4ff", fontWeight: "900", fontSize: 22},
  row: {flexDirection: "row", alignItems: "center", justifyContent: "space-between"}, hearts: {flexDirection: "row", flexWrap: "wrap", minHeight: 63, paddingTop: 11}, heart: {color: "#fb7185", fontSize: 28, paddingRight: 5}, gameCard: {alignItems: "flex-start"}, score: {color: "#5eead4", fontSize: 23, fontWeight: "900", paddingTop: 9}, coreButton: {alignSelf: "center", alignItems: "center", justifyContent: "center", height: 78, width: 78, marginVertical: 13, borderRadius: 39, backgroundColor: "#fb7185", shadowColor: "#fb7185", shadowOpacity: .8, shadowRadius: 16, elevation: 8}, coreText: {fontSize: 37, color: "#fff"},
  action: {alignSelf: "flex-start", marginTop: 12, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: "#42425b", borderRadius: 10, backgroundColor: "#232338"}, actionPrimary: {backgroundColor: "#5eead4", borderColor: "#5eead4"}, actionText: {color: "#f6f4ff", fontSize: 13, fontWeight: "800"}, actionPrimaryText: {color: "#122025"}
});
