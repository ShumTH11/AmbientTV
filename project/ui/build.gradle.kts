plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.ambienttv.ui"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        minSdk = libs.versions.minSdk.get().toInt()
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(project(":domain"))
    implementation(project(":player"))
    
    // Compose TV
    implementation(libs.compose.tv.foundation)
    implementation(libs.compose.tv.material)
    
    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.androidx.activity.compose)
    
    // Navigation
    implementation(libs.navigation.compose)
    implementation(libs.hilt.navigation.compose)
    
    // ViewModel
    implementation(libs.lifecycle.viewmodel)
    implementation(libs.lifecycle.runtime)
    
    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    
    // Material3 (for ProgressIndicator etc.)
    implementation(libs.compose.material3)

    // Coil
    implementation(libs.coil.compose)

    // Media3 common (for UnstableApi) + UI (for PlayerView)
    implementation(libs.media3.common)
    implementation(libs.media3.ui)

    // Coroutines
    implementation(libs.coroutines.android)

    // Logging
    implementation(libs.timber)
}
