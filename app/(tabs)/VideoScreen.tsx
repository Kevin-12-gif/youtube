import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from './types';
import { WebView } from 'react-native-webview';

type VideoRouteProp = RouteProp<RootStackParamList, 'Video'>;

const { width } = Dimensions.get('window');

export default function VideoScreen() {
  const route = useRoute<VideoRouteProp>();
  const navigation = useNavigation();
  const { videoId, title } = route.params;
  const [likes, setLikes] = useState(123);
  const [dislikes, setDislikes] = useState(4);
  const [subscribed, setSubscribed] = useState(false);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Video Player */}
      <WebView
        style={styles.webview}
        javaScriptEnabled={true}
        source={{ uri: `https://www.youtube.com/embed/${videoId}?controls=1&autoplay=0` }}
      />

      {/* Video Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => setLikes(likes + 1)}>
          <Text style={styles.actionBtn}>👍 {likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDislikes(dislikes + 1)}>
          <Text style={styles.actionBtn}>👎 {dislikes}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSubscribed(!subscribed)}
          style={[
            styles.subscribeBtn,
            { backgroundColor: subscribed ? '#888' : '#cc0000' },
          ]}
        >
          <Text style={styles.subscribeText}>
            {subscribed ? 'Subscribed' : 'Subscribe'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Video Description & Comments */}
      <ScrollView style={styles.commentsSection}>
        <Text style={styles.sectionTitle}>Comments</Text>
        {[...Array(10)].map((_, idx) => (
          <View key={idx} style={styles.comment}>
            <Text style={styles.commentAuthor}>User{idx + 1}:</Text>
            <Text style={styles.commentText}>This is a sample comment for the video.</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#111',
  },
  backBtn: { fontSize: 20, color: '#fff', marginRight: 10 },
  title: { fontSize: 16, color: '#fff', flexShrink: 1 },
  webview: { width, height: (width * 9) / 16 }, // 16:9 ratio
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    justifyContent: 'space-around',
    backgroundColor: '#111',
  },
  actionBtn: { color: '#fff', fontSize: 16 },
  subscribeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  subscribeText: { color: '#fff', fontWeight: 'bold' },
  commentsSection: { flex: 1, padding: 12, backgroundColor: '#000' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  comment: { marginBottom: 10 },
  commentAuthor: { color: '#0af', fontWeight: 'bold' },
  commentText: { color: '#fff' },
});
