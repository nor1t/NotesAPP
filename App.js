import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Text,
  Switch,
  Modal,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const NOTES_KEY = 'notes';
const SETTINGS_KEY = 'app_settings';
const SEARCH_HISTORY_KEY = 'search_history';

export default function App() {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [categories] = useState(['Personal', 'Work', 'Ideas', 'Tasks', 'Other']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [username, setUsername] = useState('User');
  const [language, setLanguage] = useState('en');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const theme = {
    colors: {
      background: isDarkMode ? '#121212' : '#f6f6f6',
      surface: isDarkMode ? '#1e1e1e' : '#ffffff',
      text: isDarkMode ? '#ffffff' : '#000000',
      primary: isDarkMode ? '#ff9800' : '#ff5722', // Orange theme
      secondary: isDarkMode ? '#ffb74d' : '#ff8a65', // Light orange
      error: isDarkMode ? '#cf6679' : '#B00020',
      border: isDarkMode ? '#333333' : '#dddddd',
    }
  };

  // Language options with flags
  const languageOptions = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'sq', name: 'Albanian', flag: '🇦🇱' }
  ];

  // Load data on app start
  useEffect(() => {
    loadData();
  }, []);

  // Filter notes when search query or category changes
  useEffect(() => {
    filterNotes();
  }, [searchQuery, notes, selectedCategory]);

  const loadData = async () => {
    try {
      const [loadedNotes, settings, history] = await Promise.all([
        getNotes(),
        getSettings(),
        getSearchHistory(),
      ]);

      if (loadedNotes) setNotes(loadedNotes);
      if (settings) {
        setIsDarkMode(settings.theme === 'dark');
        setUsername(settings.username || 'User');
        setLanguage(settings.language || 'en');
        setIsLoggedIn(settings.isLoggedIn || false);
      }
      if (history) setSearchHistory(history);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getNotes = async () => {
    try {
      const notes = await AsyncStorage.getItem(NOTES_KEY);
      return notes ? JSON.parse(notes) : [];
    } catch (error) {
      console.error('Error loading notes:', error);
      return [];
    }
  };

  const getSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem(SETTINGS_KEY);
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Error loading settings:', error);
      return null;
    }
  };

  const getSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error loading search history:', error);
      return [];
    }
  };

  const saveNotes = async (notes) => {
    try {
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('Error saving notes:', error);
      throw error;
    }
  };

  const saveSettings = async (settings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  const saveSearchHistory = async (history) => {
    try {
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving search history:', error);
      throw error;
    }
  };

  const filterNotes = () => {
    let filtered = notes;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        note =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query) ||
          note.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredNotes(filtered);
  };

  const saveNote = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in both title and content');
      return;
    }

    const newNote = {
      id: editingNote ? editingNote.id : Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      date: new Date().toISOString(),
      category: selectedCategory !== 'All' ? selectedCategory : 'Personal',
      tags: extractTags(content),
    };

    let updatedNotes;
    if (editingNote) {
      updatedNotes = notes.map(note =>
        note.id === editingNote.id ? newNote : note
      );
    } else {
      updatedNotes = [newNote, ...notes];
    }

    setNotes(updatedNotes);
    await saveNotes(updatedNotes);
    resetForm();
    setShowNoteForm(false);
  };

  const extractTags = (text) => {
    const tagRegex = /#(\w+)/g;
    const tags = [];
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1]);
    }
    return tags;
  };

  const editNote = (note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSelectedCategory(note.category || 'Personal');
    setShowNoteForm(true);
  };

  const deleteNote = (noteId) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedNotes = notes.filter(note => note.id !== noteId);
            setNotes(updatedNotes);
            await saveNotes(updatedNotes);
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEditingNote(null);
    setSelectedCategory('All');
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      const updatedHistory = [
        query,
        ...searchHistory.filter(item => item !== query).slice(0, 4)
      ];
      setSearchHistory(updatedHistory);
      saveSearchHistory(updatedHistory);
    }
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    saveSearchHistory([]);
  };

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    const settings = {
      theme: newTheme ? 'dark' : 'light',
      language: language,
      username: username,
      isLoggedIn: isLoggedIn,
    };
    await saveSettings(settings);
  };

  const handleLanguageChange = async (langCode) => {
    setLanguage(langCode);
    const settings = {
      theme: isDarkMode ? 'dark' : 'light',
      language: langCode,
      username: username,
      isLoggedIn: isLoggedIn,
    };
    await saveSettings(settings);
  };

  const handleLogin = async () => {
    const newLoginState = !isLoggedIn;
    setIsLoggedIn(newLoginState);
    const settings = {
      theme: isDarkMode ? 'dark' : 'light',
      language: language,
      username: username,
      isLoggedIn: newLoginState,
    };
    await saveSettings(settings);
    
    if (newLoginState) {
      Alert.alert('Success', 'You are now logged in!');
    } else {
      Alert.alert('Success', 'You are now logged out!');
    }
  };

  const saveSettingsData = async () => {
    const settings = {
      theme: isDarkMode ? 'dark' : 'light',
      language: language,
      username: username,
      isLoggedIn: isLoggedIn,
    };
    await saveSettings(settings);
    setSettingsVisible(false);
  };

  const clearAllNotes = () => {
    Alert.alert(
      'Clear All Notes',
      'This will delete all your notes. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setNotes([]);
            await saveNotes([]);
          },
        },
      ]
    );
  };

  const NoteCard = ({ note }) => {
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', minute: '2-digit' 
      });
    };

    return (
      <View style={[styles.noteCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.noteHeader}>
          <Text style={[styles.noteTitle, { color: theme.colors.text }]}>{note.title}</Text>
          <View style={[styles.category, { borderColor: theme.colors.primary }]}>
            <Text style={[styles.categoryText, { color: theme.colors.primary }]}>
              {note.category || 'Personal'}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.noteContent, { color: theme.colors.text }]}>{note.content}</Text>
        
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {note.tags.map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.tagText, { color: theme.colors.primary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.noteFooter}>
          <Text style={[styles.noteDate, { color: theme.colors.text, opacity: 0.6 }]}>
            {formatDate(note.date)}
          </Text>
          <View style={styles.noteActions}>
            <TouchableOpacity onPress={() => editNote(note)} style={styles.actionButton}>
              <Text style={[styles.actionText, { color: theme.colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteNote(note.id)} style={styles.actionButton}>
              <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const SearchHistory = () => {
    if (searchHistory.length === 0) return null;

    return (
      <View style={[styles.searchHistoryCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.searchHistoryHeader}>
          <Text style={[styles.searchHistoryTitle, { color: theme.colors.text }]}>
            Recent Searches
          </Text>
          <TouchableOpacity onPress={clearSearchHistory} style={styles.clearButton}>
            <Text style={[styles.clearText, { color: theme.colors.error }]}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.historyContainer}>
            {searchHistory.map((term, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSearch(term)}
                style={[styles.historyChip, { borderColor: theme.colors.primary }]}
              >
                <Text style={[styles.historyText, { color: theme.colors.primary }]}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notes App</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={toggleTheme} 
            style={[styles.headerButton, { backgroundColor: theme.colors.primary + '20' }]}
          >
            <Text style={[styles.headerButtonText, { color: theme.colors.primary }]}>
              {isDarkMode ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setSettingsVisible(true)} 
            style={[styles.headerButton, { backgroundColor: theme.colors.primary + '20' }]}
          >
            <Text style={[styles.headerButtonText, { color: theme.colors.primary }]}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Search Section */}
        <View style={[styles.searchCard, { backgroundColor: theme.colors.surface }]}>
          <TextInput
            placeholder="Search notes..."
            placeholderTextColor={theme.colors.text + '80'}
            value={searchQuery}
            onChangeText={handleSearch}
            style={[styles.searchInput, { 
              color: theme.colors.text, 
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.background 
            }]}
          />
          
          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            <View style={styles.categoriesContainer}>
              {['All', ...categories].map(category => (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: selectedCategory === category ? theme.colors.primary : 'transparent',
                      borderColor: theme.colors.primary
                    }
                  ]}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { 
                      color: selectedCategory === category ? '#ffffff' : theme.colors.primary 
                    }
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Search History */}
        <SearchHistory />

        {/* Notes List */}
        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Text style={[styles.notesTitle, { color: theme.colors.text }]}>
              {selectedCategory !== 'All' ? `${selectedCategory} Notes` : 'All Notes'} 
              ({filteredNotes.length})
            </Text>
            {notes.length > 0 && (
              <TouchableOpacity 
                onPress={clearAllNotes}
                style={[styles.clearAllButton, { borderColor: theme.colors.error }]}
              >
                <Text style={[styles.clearAllText, { color: theme.colors.error }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredNotes.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.emptyText, { color: theme.colors.text, opacity: 0.6 }]}>
                {searchQuery || selectedCategory !== 'All' 
                  ? 'No notes found matching your criteria' 
                  : 'No notes yet. Press the + button to create your first note!'}
              </Text>
            </View>
          ) : (
            filteredNotes.map(note => (
              <NoteCard key={note.id} note={note} />
            ))
          )}
        </View>
      </ScrollView>

      {/* PLUS Button for Adding Notes */}
      {!showNoteForm && (
        <TouchableOpacity
          style={[styles.plusButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowNoteForm(true)}
        >
          <Text style={styles.plusButtonText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Fullscreen Note Input Form - Only shown when PLUS is pressed */}
      {showNoteForm && (
        <View style={[styles.fullscreenForm, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.formHeader, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity 
              onPress={() => {
                setShowNoteForm(false);
                resetForm();
              }}
              style={styles.backButton}
            >
              <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.formTitle, { color: theme.colors.text }]}>
              {editingNote ? 'Edit Note' : 'Create New Note'}
            </Text>
            <TouchableOpacity
              onPress={saveNote}
              style={[styles.saveHeaderButton, { 
                backgroundColor: theme.colors.primary,
                opacity: (!title.trim() || !content.trim()) ? 0.5 : 1 
              }]}
              disabled={!title.trim() || !content.trim()}
            >
              <Text style={[styles.saveHeaderButtonText, { color: '#ffffff' }]}>
                {editingNote ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            <TextInput
              placeholder="Note Title"
              placeholderTextColor={theme.colors.text + '80'}
              value={title}
              onChangeText={setTitle}
              style={[styles.fullscreenInput, { 
                color: theme.colors.text, 
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.surface 
              }]}
            />
            <TextInput
              placeholder="Note Content (use #tags for categorization)"
              placeholderTextColor={theme.colors.text + '80'}
              value={content}
              onChangeText={setContent}
              multiline
              style={[styles.fullscreenTextArea, { 
                color: theme.colors.text, 
                backgroundColor: theme.colors.surface 
              }]}
              textAlignVertical="top"
            />
          </ScrollView>
        </View>
      )}

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Settings</Text>
            
            <View style={styles.setting}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={[styles.modalInput, { 
                  color: theme.colors.text, 
                  borderColor: theme.colors.primary,
                  backgroundColor: theme.colors.surface 
                }]}
                placeholder="Enter your username"
                placeholderTextColor={theme.colors.text + '80'}
              />
            </View>

            <View style={styles.setting}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Language</Text>
              <View style={styles.languageOptions}>
                {languageOptions.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => handleLanguageChange(lang.code)}
                    style={[
                      styles.languageOption,
                      { 
                        backgroundColor: language === lang.code ? theme.colors.primary : theme.colors.surface,
                        borderColor: theme.colors.primary
                      }
                    ]}
                  >
                    <Text style={[
                      styles.languageText,
                      { color: language === lang.code ? '#ffffff' : theme.colors.text }
                    ]}>
                      {lang.flag} {lang.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Dark Mode</Text>
              <Switch 
                value={isDarkMode} 
                onValueChange={toggleTheme}
                thumbColor={isDarkMode ? theme.colors.primary : '#f4f3f4'}
                trackColor={{ false: '#767577', true: theme.colors.primary + '80' }}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setSettingsVisible(false)}
                style={[styles.modalButton, styles.modalCancelButton, { borderColor: theme.colors.primary }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveSettingsData}
                style={[styles.modalButton, styles.modalSaveButton, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 55, // Increased margin top
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  categoriesScroll: {
    marginTop: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchHistoryCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    padding: 8,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  historyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  historyText: {
    fontSize: 14,
  },
  notesSection: {
    marginBottom: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginLeft: 12,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noteCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  category: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  // PLUS Button
  plusButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  plusButtonText: {
    fontSize: 30,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  // Fullscreen Note Input Form
  fullscreenForm: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginTop: 60,
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  saveHeaderButton: {
    marginTop: 60,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveHeaderButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  formContent: {
    flex: 1,
    padding: 16,
  },
  fullscreenInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    marginBottom: 16,
    fontWeight: '600',
  },
  fullscreenTextArea: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  setting: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  languageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 17,
  },
  languageOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  languageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  modalCancelButton: {
    marginTop: 0,
    borderWidth: 1,
  },
  modalSaveButton: {
    // backgroundColor is set inline
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});