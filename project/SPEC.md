# AmbientTV — SPECIFICATION

## 1. Overview

AmbientTV is an Android TV application (API 26+) that plays looped videos with synchronized music based on category matching. Built with Clean Architecture + Modularization for future AI content adaptation.

**Package**: `com.ambienttv.app`
**Min SDK**: 26 (Android 8.0)
**Target SDK**: 34
**Language**: Kotlin 2.0

---

## 2. Module Structure

```
├── :app          → Entry point, DI (Hilt), Application, MainActivity
├── :domain       → Models, Repository interfaces, UseCases, AIContentAdapter interface
├── :data         → Local (Room, FileScanner), Remote (Retrofit), AI adapters, LicenseChecker
├── :player       → Media3/ExoPlayer wrapper, SyncedPlaybackManager, MediaSession
├── :ai           → CategoryMatcher, ContentRouter, AI providers config, LRU cache
└── :ui           → Compose TV screens, navigation, D-pad handling
```

---

## 3. Domain Module (`:domain`)

### 3.1 Data Models

```kotlin
// ContentCategory.kt
data class ContentCategory(
    val id: String,
    val name: String,
    val description: String,
    val defaultTags: List<ContentTag>,
    val thumbnailUrl: String? = null
)

// ContentTag.kt  
data class ContentTag(
    val key: String,
    val value: String,
    val confidence: Float = 1.0f
)

// ContentItem.kt
data class ContentItem(
    val id: String,
    val type: MediaType, // VIDEO or AUDIO
    val source: ContentSource, // LOCAL, YOUTUBE, INTERNET_ARCHIVE, PIXABAY, PEXELS, AI_GENERATED
    val uri: String,
    val title: String,
    val tags: List<ContentTag>,
    val category: ContentCategory,
    val licenseType: LicenseType, // FREE, CC0, CREATIVE_COMMONS, PROPRIETARY
    val metadata: MediaMetadata,
    val localPath: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

// MediaType.kt
enum class MediaType { VIDEO, AUDIO }

// ContentSource.kt
enum class ContentSource { LOCAL, YOUTUBE, INTERNET_ARCHIVE, PIXABAY, PEXELS, AI_GENERATED }

// LicenseType.kt
enum class LicenseType { FREE, CC0, CREATIVE_COMMONS, PROPRIETARY }

// MediaMetadata.kt
data class MediaMetadata(
    val durationMs: Long = 0,
    val bpm: Int? = null,
    val mood: String? = null,
    val era: String? = null,
    val colorPalette: List<String> = emptyList(),
    val resolution: String? = null,
    val fileSize: Long = 0
)

// ContentPair.kt
data class ContentPair(
    val id: String = UUID.randomUUID().toString(),
    val video: ContentItem,
    val audio: ContentItem,
    val matchScore: Float,
    val isUserOverride: Boolean = false
)
```

### 3.2 Repository Interfaces

```kotlin
// ContentRepository.kt
interface ContentRepository {
    suspend fun scanLocalContent(paths: List<String>): Flow<List<ContentItem>>
    suspend fun searchByCategory(category: ContentCategory): List<ContentItem>
    suspend fun searchByTags(tags: List<ContentTag>): List<ContentItem>
    suspend fun getContentPairs(category: ContentCategory): List<ContentPair>
    suspend fun saveContentPair(pair: ContentPair)
    suspend fun deleteContentPair(pairId: String)
    fun getAllCategories(): Flow<List<ContentCategory>>
    suspend fun addCategory(category: ContentCategory)
}
```

### 3.3 AI Adapter Interface

```kotlin
// AIContentAdapter.kt
interface AIContentAdapter {
    suspend fun matchContentByCategory(category: ContentCategory): ContentPair
    suspend fun selectContentByAudio(input: AudioFeatures): ContentItem
    suspend fun selectContentByVisual(input: VisualFeatures): ContentItem
    suspend fun generateMedia(prompt: String, type: MediaType): MediaResult
    suspend fun analyzeEnvironment(): Flow<AmbientProfile>
}

// AudioFeatures.kt
data class AudioFeatures(
    val bpm: Float,
    val key: String?,
    val mood: String?,
    val genre: String?,
    val spectralCentroid: Float? = null
)

// VisualFeatures.kt
data class VisualFeatures(
    val dominantColors: List<String>,
    val motionLevel: Float,
    val sceneType: String?,
    val brightness: Float
)

// MediaResult.kt
sealed class MediaResult {
    data class Success(val contentItem: ContentItem) : MediaResult()
    data class Error(val message: String, val fallback: ContentItem? = null) : MediaResult()
    data class InProgress(val progress: Float) : MediaResult()
}

// AmbientProfile.kt
data class AmbientProfile(
    val audioFingerprint: AudioFeatures? = null,
    val visualFingerprint: VisualFeatures? = null,
    val suggestedCategory: ContentCategory? = null,
    val timestamp: Long = System.currentTimeMillis()
)
```

### 3.4 UseCases

```kotlin
// MatchContentUseCase.kt
class MatchContentUseCase @Inject constructor(
    private val contentRepository: ContentRepository,
    private val aiContentAdapter: AIContentAdapter
) {
    suspend operator fun invoke(category: ContentCategory): ContentPair
}

// PlayContentPairUseCase.kt
class PlayContentPairUseCase @Inject constructor(
    private val contentRepository: ContentRepository
) {
    suspend operator fun invoke(pair: ContentPair): PlaybackSession
}

// ScanLocalContentUseCase.kt
class ScanLocalContentUseCase @Inject constructor(
    private val contentRepository: ContentRepository
) {
    suspend operator fun invoke(paths: List<String> = DEFAULT_PATHS): Flow<ScanResult>
}

// GetCategoriesUseCase.kt
class GetCategoriesUseCase @Inject constructor(
    private val contentRepository: ContentRepository
) {
    operator fun invoke(): Flow<List<ContentCategory>>
}

// GenerateMediaUseCase.kt
class GenerateMediaUseCase @Inject constructor(
    private val aiContentAdapter: AIContentAdapter
) {
    suspend operator fun invoke(prompt: String, type: MediaType): Flow<MediaResult>
}
```

### 3.5 Enums & Supporting Types

```kotlin
// MatchPriority.kt
enum class MatchPriority {
    EXACT_MATCH,      // category + mood + bpm align
    PARTIAL_MATCH,    // category matches, some tags align
    FALLBACK          // default category
}

// PlaybackSession.kt
data class PlaybackSession(
    val pair: ContentPair,
    val sessionId: String = UUID.randomUUID().toString(),
    val startedAt: Long = System.currentTimeMillis()
)

// ScanResult.kt
sealed class ScanResult {
    data class Progress(val scanned: Int, val total: Int, val currentPath: String) : ScanResult()
    data class Completed(val items: List<ContentItem>) : ScanResult()
    data class Error(val path: String, val exception: Throwable) : ScanResult()
}
```

---

## 4. Data Module (`:data`)

### 4.1 Room Database

```kotlin
// AppDatabase.kt
@Database(entities = [ContentEntity::class, ContentPairEntity::class, CategoryEntity::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun contentDao(): ContentDao
    abstract fun contentPairDao(): ContentPairDao
    abstract fun categoryDao(): CategoryDao
}

// ContentEntity.kt
@Entity(tableName = "content_items")
data class ContentEntity(
    @PrimaryKey val id: String,
    val type: String, // "VIDEO" or "AUDIO"
    val source: String,
    val uri: String,
    val title: String,
    val tagsJson: String, // serialized List<ContentTag>
    val categoryId: String,
    val licenseType: String,
    val metadataJson: String, // serialized MediaMetadata
    val localPath: String?,
    val createdAt: Long
)

// ContentPairEntity.kt
@Entity(tableName = "content_pairs")
data class ContentPairEntity(
    @PrimaryKey val id: String,
    val videoId: String,
    val audioId: String,
    val matchScore: Float,
    val isUserOverride: Boolean
)

// CategoryEntity.kt
@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String,
    val defaultTagsJson: String,
    val thumbnailUrl: String?
)
```

### 4.2 DAOs

```kotlin
// ContentDao.kt
@Dao
interface ContentDao {
    @Query("SELECT * FROM content_items WHERE categoryId = :categoryId")
    suspend fun getByCategory(categoryId: String): List<ContentEntity>
    
    @Query("SELECT * FROM content_items WHERE type = :type")
    suspend fun getByType(type: String): List<ContentEntity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<ContentEntity>)
    
    @Query("DELETE FROM content_items WHERE source = 'LOCAL'")
    suspend fun clearLocalContent()
}

// ContentPairDao.kt
@Dao
interface ContentPairDao {
    @Query("SELECT * FROM content_pairs")
    suspend fun getAll(): List<ContentPairEntity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(pair: ContentPairEntity)
    
    @Query("DELETE FROM content_pairs WHERE id = :pairId")
    suspend fun delete(pairId: String)
}

// CategoryDao.kt
@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories")
    fun getAll(): Flow<List<CategoryEntity>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(category: CategoryEntity)
    
    @Query("SELECT * FROM categories WHERE id = :id")
    suspend fun getById(id: String): CategoryEntity?
}
```

### 4.3 Data Sources

```kotlin
// LocalDataSource.kt
interface LocalDataSource {
    suspend fun scanDirectories(paths: List<String>): Flow<List<ContentItem>>
    suspend fun readSidecarMetadata(file: File): ContentMetadata?
    suspend fun getCachedContent(): List<ContentItem>
}

// LocalDataSourceImpl.kt
class LocalDataSourceImpl @Inject constructor(
    private val contentDao: ContentDao,
    private val fileScanner: FileScanner
) : LocalDataSource

// FileScanner.kt
class FileScanner @Inject constructor() {
    fun scanDirectory(path: String, extensions: List<String>): Flow<File>
    fun parseId3Tags(audioFile: File): MediaMetadata?
    fun parseSidecarJson(jsonFile: File): ContentMetadata?
}

// RemoteDataSource.kt
interface RemoteDataSource {
    suspend fun searchYouTube(query: String, maxResults: Int = 10): List<ContentItem>
    suspend fun searchPixabayVideos(query: String): List<ContentItem>
    suspend fun searchPexelsVideos(query: String): List<ContentItem>
    suspend fun searchInternetArchive(query: String): List<ContentItem>
}

// RemoteDataSourceImpl.kt
class RemoteDataSourceImpl @Inject constructor(
    private val youTubeApi: YouTubeApi,
    private val pixabayApi: PixabayApi,
    private val pexelsApi: PexelsApi,
    private val internetArchiveApi: InternetArchiveApi
) : RemoteDataSource

// GenerationDataSource.kt
interface GenerationDataSource {
    suspend fun generateMusic(prompt: String): MediaResult
    suspend fun generateVideo(prompt: String): MediaResult
    suspend fun checkStatus(generationId: String): GenerationStatus
}

// LicenseChecker.kt
class LicenseChecker @Inject constructor() {
    fun validateLicense(content: ContentItem): LicenseValidation
    fun canPlay(content: ContentItem): Boolean
}

// LicenseValidation.kt
data class LicenseValidation(
    val isValid: Boolean,
    val requiresAttribution: Boolean,
    val attributionText: String? = null,
    val restrictions: List<String> = emptyList()
)

// CatalogDataSource.kt
@Singleton
class CatalogDataSource @Inject constructor(
    @ApplicationContext private val context: Context
) {
    fun getPairs(category: ContentCategory): List<ContentPair>
}

// Catalog DTOs (kotlinx.serialization)
@Serializable
data class CatalogDto(val version: Int, val categories: List<CatalogCategoryDto>)
@Serializable
data class CatalogCategoryDto(val id: String, val pairs: List<CatalogPairDto>)
@Serializable
data class CatalogPairDto(val videoUrl: String, val audioUrl: String, val title: String, val tags: List<CatalogTagDto>)
@Serializable
data class CatalogTagDto(val key: String, val value: String)
```

### 4.4 Repository Implementation

```kotlin
// ContentRepositoryImpl.kt
class ContentRepositoryImpl @Inject constructor(
    private val localDataSource: LocalDataSource,
    private val remoteDataSource: RemoteDataSource,
    private val generationDataSource: GenerationDataSource,
    private val licenseChecker: LicenseChecker,
    private val contentDao: ContentDao,
    private val contentPairDao: ContentPairDao,
    private val categoryDao: CategoryDao
) : ContentRepository
```

### 4.5 API Interfaces

```kotlin
// YouTubeApi.kt
interface YouTubeApi {
    @GET("youtube/v3/search")
    suspend fun searchVideos(
        @Query("q") query: String,
        @Query("maxResults") maxResults: Int = 10,
        @Query("type") type: String = "video",
        @Query("videoDuration") duration: String = "short"
    ): YouTubeSearchResponse
}

// PixabayApi.kt
interface PixabayApi {
    @GET("api/videos/")
    suspend fun searchVideos(
        @Query("q") query: String,
        @Query("per_page") perPage: Int = 10
    ): PixabayResponse
}

// PexelsApi.kt
interface PexelsApi {
    @GET("videos/search")
    suspend fun searchVideos(
        @Query("query") query: String,
        @Query("per_page") perPage: Int = 10
    ): PexelsResponse
}
```

---

## 5. Player Module (`:player`)

### 5.1 Core Classes

```kotlin
// ExoPlayerWrapper.kt
@Singleton
class ExoPlayerWrapper @Inject constructor(
    @ApplicationContext context: Context
) {
    fun prepareVideo(uri: String, loop: Boolean = true)
    fun prepareAudio(uri: String, loop: Boolean = true)
    fun play()
    fun pause()
    fun stop()
    fun release()
    fun setVolume(volume: Float)
    val playerState: Flow<PlayerState>
}

// PlayerState.kt
sealed class PlayerState {
    object Idle : PlayerState()
    object Loading : PlayerState()
    data class Playing(val position: Long, val duration: Long) : PlayerState()
    object Paused : PlayerState()
    data class Error(val exception: Throwable) : PlayerState()
}

// SyncedPlaybackManager.kt
@Singleton
class SyncedPlaybackManager @Inject constructor(
    private val videoPlayer: ExoPlayerWrapper,
    private val audioPlayer: ExoPlayerWrapper
) {
    suspend fun loadPair(pair: ContentPair): Boolean
    fun play()
    fun pause()
    fun stop()
    fun seekTo(position: Long)
    fun setAudioVolume(volume: Float)
    fun setVideoMute(muted: Boolean)
    val syncState: Flow<SyncState>
}

// SyncState.kt
data class SyncState(
    val isSynced: Boolean,
    val videoPosition: Long,
    val audioPosition: Long,
    val driftMs: Long,
    val isLooping: Boolean
)
```

### 5.2 Service & Session

```kotlin
// PlaybackCacheManager.kt
@Singleton
@UnstableApi
class PlaybackCacheManager @Inject constructor(@ApplicationContext context: Context) {
    val cache: SimpleCache
    fun buildCacheDataSourceFactory(): DataSource.Factory
    fun release()
}

// PlaybackService.kt
class PlaybackService : MediaLibraryService() {
    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession?
    override fun onCreate()
    override fun onDestroy()
}

// MediaSessionCallback.kt
class MediaSessionCallback : MediaLibrarySession.Callback {
    override fun onAddMediaItems(...)
    override fun onConnect(...)
}
```

---

## 6. AI Module (`:ai`)

### 6.1 Core Classes

```kotlin
// CategoryMatcher.kt
@Singleton
class CategoryMatcher @Inject constructor() {
    fun match(video: ContentItem, audio: ContentItem): MatchResult
    fun findBestMatches(
        videos: List<ContentItem>,
        audios: List<ContentItem>,
        category: ContentCategory
    ): List<ContentPair>
}

// MatchResult.kt
data class MatchResult(
    val score: Float, // 0.0 - 1.0
    val priority: MatchPriority,
    val matchedTags: List<ContentTag>,
    val mismatchedTags: List<ContentTag>
)

// ContentRouter.kt
@Singleton
class ContentRouter @Inject constructor(
    private val localDataSource: LocalDataSource,
    private val remoteDataSource: RemoteDataSource,
    private val generationDataSource: GenerationDataSource
) {
    suspend fun resolveContent(category: ContentCategory): ContentResolution
    suspend fun resolveWithFallback(category: ContentCategory): ContentPair
}

// ContentResolution.kt
sealed class ContentResolution {
    data class Local(val items: List<ContentItem>) : ContentResolution()
    data class Remote(val items: List<ContentItem>) : ContentResolution()
    data class Generated(val result: MediaResult) : ContentResolution()
    data class Fallback(val defaultCategory: ContentCategory) : ContentResolution()
}

// AIProviderConfig.kt
data class AIProviderConfig(
    val provider: AIProvider,
    val apiKey: String?,
    val baseUrl: String?,
    val timeoutMs: Long = 30000,
    val enabled: Boolean = true
)

// AIProvider.kt
enum class AIProvider { SUNO, MUSICGEN, STABLE_AUDIO, RUNWAY, STABLE_VIDEO, PIKA }

// ContentCache.kt
@Singleton
class ContentCache @Inject constructor() {
    fun get(key: String): ContentItem?
    fun put(key: String, item: ContentItem)
    fun evict(key: String)
    fun clear()
}
```

### 6.2 AI Adapter Implementation

```kotlin
// AIContentAdapterImpl.kt
class AIContentAdapterImpl @Inject constructor(
    private val categoryMatcher: CategoryMatcher,
    private val contentRouter: ContentRouter,
    private val contentCache: ContentCache
) : AIContentAdapter
```

---

## 7. UI Module (`:ui`)

### 7.1 Screens (Compose TV)

```kotlin
// CategoryBrowserScreen.kt
@Composable
fun CategoryBrowserScreen(
    viewModel: CategoryBrowserViewModel = hiltViewModel(),
    onCategorySelected: (ContentCategory) -> Unit,
    onNavigateToSettings: () -> Unit
)

// ContentPairPlayerScreen.kt
@Composable
fun ContentPairPlayerScreen(
    viewModel: PlayerViewModel = hiltViewModel(),
    pair: ContentPair,
    onBack: () -> Unit
)

// SettingsScreen.kt
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = hiltViewModel(),
    onBack: () -> Unit
)

// AmbientModeScreen.kt
@Composable
fun AmbientModeScreen(
    viewModel: AmbientViewModel = hiltViewModel()
)
```

### 7.2 ViewModels

```kotlin
// CategoryBrowserViewModel.kt
@HiltViewModel
class CategoryBrowserViewModel @Inject constructor(
    private val getCategoriesUseCase: GetCategoriesUseCase
) : ViewModel() {
    val categories: StateFlow<List<ContentCategory>>
    val isLoading: StateFlow<Boolean>
}

// PlayerViewModel.kt
@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val syncedPlaybackManager: SyncedPlaybackManager,
    private val matchContentUseCase: MatchContentUseCase
) : ViewModel() {
    val playerState: StateFlow<PlayerState>
    val syncState: StateFlow<SyncState>
    fun play()
    fun pause()
    fun stop()
}

// SettingsViewModel.kt
@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val scanLocalContentUseCase: ScanLocalContentUseCase
) : ViewModel()
```

### 7.3 Navigation

```kotlin
// Screen.kt (sealed class routes)
sealed class Screen(val route: String) {
    object CategoryBrowser : Screen("categories")
    object ContentPairPlayer : Screen("player/{pairId}")
    object Settings : Screen("settings")
    object AmbientMode : Screen("ambient")
}

// TvNavigation.kt
@Composable
fun TvNavigation(
    navController: NavHostController = rememberNavController()
)
```

---

## 8. App Module (`:app`)

### 8.1 Application Class

```kotlin
// AmbientTVApplication.kt
@HiltAndroidApp
class AmbientTVApplication : Application() {
    override fun onCreate()
}
```

### 8.2 MainActivity

```kotlin
// MainActivity.kt
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?)
}
```

### 8.3 DI Modules

```kotlin
// DatabaseModule.kt
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule

// NetworkModule.kt
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule

// PlayerModule.kt
@Module
@InstallIn(SingletonComponent::class)
object PlayerModule

// AIModule.kt
@Module
@InstallIn(SingletonComponent::class)
object AIModule
```

---

## 9. Gradle Configuration

### 9.1 Version Catalog (`gradle/libs.versions.toml`)

```toml
[versions]
kotlin = "2.0.0"
agp = "8.3.0"
compileSdk = "34"
minSdk = "26"
targetSdk = "34"

compose-bom = "2024.02.00"
compose-tv = "1.0.0-alpha10"
media3 = "1.2.1"
hilt = "2.50"
room = "2.6.1"
retrofit = "2.9.0"
kotlinx-serialization = "1.6.2"
coroutines = "1.7.3"
lifecycle = "2.7.0"
navigation = "2.7.7"

[libraries]
# Compose TV
compose-tv-foundation = { module = "androidx.tv:tv-foundation", version.ref = "compose-tv" }
compose-tv-material = { module = "androidx.tv:tv-material", version.ref = "compose-tv" }

# Media3
media3-exoplayer = { module = "androidx.media3:media3-exoplayer", version.ref = "media3" }
media3-session = { module = "androidx.media3:media3-session", version.ref = "media3" }
media3-ui = { module = "androidx.media3:media3-ui", version.ref = "media3" }
media3-common = { module = "androidx.media3:media3-common", version.ref = "media3" }

# Hilt
hilt-android = { module = "com.google.dagger:hilt-android", version.ref = "hilt" }
hilt-compiler = { module = "com.google.dagger:hilt-compiler", version.ref = "hilt" }
hilt-navigation-compose = { module = "androidx.hilt:hilt-navigation-compose", version = "1.1.0" }

# Room
room-runtime = { module = "androidx.room:room-runtime", version.ref = "room" }
room-ktx = { module = "androidx.room:room-ktx", version.ref = "room" }
room-compiler = { module = "androidx.room:room-compiler", version.ref = "room" }

# Network
retrofit = { module = "com.squareup.retrofit2:retrofit", version.ref = "retrofit" }
retrofit-kotlinx-serialization = { module = "com.squareup.retrofit2:converter-kotlinx-serialization", version = "1.0.0" }
okhttp-logging = { module = "com.squareup.okhttp3:logging-interceptor", version = "4.12.0" }
kotlinx-serialization-json = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "kotlinx-serialization" }

# Coroutines & Flow
coroutines-android = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-android", version.ref = "coroutines" }
coroutines-core = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "coroutines" }

# Lifecycle
lifecycle-viewmodel = { module = "androidx.lifecycle:lifecycle-viewmodel-compose", version.ref = "lifecycle" }
lifecycle-runtime = { module = "androidx.lifecycle:lifecycle-runtime-compose", version.ref = "lifecycle" }
navigation-compose = { module = "androidx.navigation:navigation-compose", version.ref = "navigation" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
android-library = { id = "com.android.library", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version = "1.9.22-1.0.17" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
compose-compiler = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
```

---

## 10. Category Presets (Default)

```kotlin
// DefaultCategories.kt
object DefaultCategories {
    val CHRISTMAS = ContentCategory(
        id = "christmas",
        name = "Christmas & New Year",
        description = "Festive winter scenes with holiday music",
        defaultTags = listOf(
            ContentTag("mood", "festive"),
            ContentTag("era", "modern"),
            ContentTag("season", "winter"),
            ContentTag("colorPalette", "red,green,gold,white")
        )
    )
    
    val FANTASY = ContentCategory(
        id = "fantasy",
        name = "Fantasy & Medieval",
        description = "Enchanted realms and medieval landscapes",
        defaultTags = listOf(
            ContentTag("mood", "epic"),
            ContentTag("era", "medieval"),
            ContentTag("genre", "fantasy"),
            ContentTag("colorPalette", "green,brown,gold")
        )
    )
    
    val CYBERPUNK = ContentCategory(
        id = "cyberpunk",
        name = "Cyberpunk & Sci-Fi",
        description = "Futuristic neon cities and space vistas",
        defaultTags = listOf(
            ContentTag("mood", "dark"),
            ContentTag("era", "future"),
            ContentTag("genre", "sci-fi"),
            ContentTag("colorPalette", "neon-blue,purple,pink,black")
        )
    )
    
    val NATURE = ContentCategory(
        id = "nature",
        name = "Nature & Relax",
        description = "Calming natural scenery with ambient sounds",
        defaultTags = listOf(
            ContentTag("mood", "calm"),
            ContentTag("era", "timeless"),
            ContentTag("genre", "ambient"),
            ContentTag("colorPalette", "green,blue,brown")
        )
    )
    
    val STEAMPUNK = ContentCategory(
        id = "steampunk",
        name = "Steampunk",
        description = "Victorian industrial steam-powered worlds",
        defaultTags = listOf(
            ContentTag("mood", "industrial"),
            ContentTag("era", "victorian"),
            ContentTag("genre", "steampunk"),
            ContentTag("colorPalette", "bronze,copper,brown,gold")
        )
    )
    
    val ALL = listOf(CHRISTMAS, FANTASY, CYBERPUNK, NATURE, STEAMPUNK)
}
```

---

## 11. File Scanning Paths

```kotlin
// ScanPaths.kt
object ScanPaths {
    val DEFAULT_MUSIC_PATHS = listOf("/media/music", "/sdcard/Music", "/storage/usb/music")
    val DEFAULT_VIDEO_PATHS = listOf("/media/videos", "/sdcard/Videos", "/storage/usb/videos")
    val DEFAULT_PAIRS_PATHS = listOf("/media/pairs", "/sdcard/AmbientTV/pairs")
    
    val SUPPORTED_VIDEO_EXTENSIONS = listOf("mp4", "webm", "mkv")
    val SUPPORTED_AUDIO_EXTENSIONS = listOf("mp3", "ogg", "aac", "flac", "wav")
}
```

---

## 12. Error Handling & Fallback Strategy

1. **Local content not found** → Scan remote sources → AI generation (if enabled) → Default category
2. **Network unavailable** → Use cached content → Local files only → Error UI with retry
3. **AI generation timeout (>30s)** → Cancel coroutine → Play local default content
4. **License violation** → Skip content → Log warning → Try next in queue
5. **Playback error** → Auto-retry (3x) → Switch pair → Show error + fallback UI
