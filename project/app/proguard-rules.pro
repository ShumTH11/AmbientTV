# AmbientTV ProGuard / R8 rules

# Keep entry point
-keep public class com.ambienttv.app.MainActivity { public *; }
-keep public class com.ambienttv.app.AmbientTVApplication { public *; }

# Hilt
-keep class dagger.hilt.** { *; }
-keep class * extends dagger.hilt.internal.GeneratedComponent { *; }
-keep class * extends dagger.hilt.internal.GeneratedComponentManagerHolder { *; }
-keep class * extends dagger.hilt.android.internal.managers.ActivityComponentManager { *; }
-keepclassmembers class * {
    @dagger.hilt.android.lifecycle.HiltViewModel <init>(...);
    @javax.inject.Inject <init>(...);
}

# Hilt Worker
-keep class * extends androidx.work.Worker { *; }
-keep class * extends androidx.work.CoroutineWorker { *; }
-keep class androidx.hilt.work.HiltWorker { *; }

# Room
-keep class com.ambienttv.data.local.entity.** { *; }
-keep class com.ambienttv.data.local.dao.** { *; }
-keep class com.ambienttv.data.local.database.AppDatabase { *; }
-keep class androidx.room.** { *; }
-dontwarn androidx.room.paging.**

# Retrofit / OkHttp
-keep class com.ambienttv.data.remote.** { *; }
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions
-keepattributes *Annotation*
-dontwarn okhttp3.**
-dontwarn retrofit2.**

# kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keepclassmembers class com.ambienttv.domain.model.** { <init>(...); }
-keep class com.ambienttv.domain.model.** { *; }

# Media3 / ExoPlayer
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# Compose
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**
-keepclassmembers class * {
    androidx.compose.runtime.Composable <methods>;
}

# Navigation Compose
-keep class androidx.navigation.** { *; }

# Keep TvProvider / Android TV APIs
-keep class androidx.tvprovider.** { *; }

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# General
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
