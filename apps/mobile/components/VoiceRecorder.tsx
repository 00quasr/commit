import { colors, fonts } from "@commit/ui-tokens";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { VOICE_MAX_MS } from "@/lib/dropTimer";

interface VoiceRecorderProps {
  uri: string | null;
  onChange: (uri: string | null) => void;
}

export function VoiceRecorder({ uri, onChange }: VoiceRecorderProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(uri ?? null);
  const [busy, setBusy] = useState(false);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, []);

  const onStartRecording = async () => {
    if (busy || recorderState.isRecording) return;
    setBusy(true);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Microphone access needed", "Allow microphone in Settings to record.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      stopTimerRef.current = setTimeout(() => {
        void onStopRecording();
      }, VOICE_MAX_MS);
    } finally {
      setBusy(false);
    }
  };

  const onStopRecording = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      await recorder.stop();
      const recordedUri = recorder.uri;
      if (recordedUri) onChange(recordedUri);
    } finally {
      setBusy(false);
    }
  };

  const onPlay = () => {
    if (!uri) return;
    if (player.playing) {
      player.pause();
    } else {
      player.seekTo(0);
      player.play();
    }
  };

  const onDelete = () => {
    if (player.playing) player.pause();
    onChange(null);
  };

  if (recorderState.isRecording) {
    const seconds = Math.ceil(recorderState.durationMillis / 1000);
    return (
      <Pressable style={[styles.row, styles.rowRecording]} onPress={() => void onStopRecording()}>
        <View style={styles.dot} />
        <Text style={styles.recordingText}>Recording · {seconds}s</Text>
        <Text style={styles.hint}>tap to stop</Text>
      </Pressable>
    );
  }

  if (uri) {
    return (
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.7 }]}
          onPress={onPlay}
        >
          <Text style={styles.playText}>{player.playing ? "❚❚" : "▶"}</Text>
        </Pressable>
        <Text style={styles.label}>Voice memo</Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={styles.delete}>Remove</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={() => void onStartRecording()}
      disabled={busy}
    >
      <View style={styles.micCircle}>
        <Text style={styles.mic}>🎤</Text>
      </View>
      <Text style={styles.label}>Add voice memo</Text>
      <Text style={styles.hint}>30s max</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
  },
  rowRecording: { backgroundColor: "#2a1010", borderColor: "#ff6b6b", borderWidth: 1 },
  micCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  mic: { fontSize: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ff6b6b" },
  label: { color: colors.fg, fontSize: 15, fontFamily: fonts.sans, flex: 1 },
  hint: { color: "#666", fontSize: 12, fontFamily: fonts.mono },
  recordingText: {
    color: "#ff6b6b",
    fontSize: 15,
    fontFamily: fonts.mono,
    flex: 1,
    fontVariant: ["tabular-nums"],
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  playText: { color: colors.bg, fontSize: 14 },
  delete: { color: "#888", fontSize: 13, fontFamily: fonts.sans },
});
