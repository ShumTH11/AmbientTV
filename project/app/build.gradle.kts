plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

android {
    namespace = "com.ambienttv.app"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        applicationId = "com.ambienttv.app"
        minSdk = libs.versions.minSdk.get().toInt()
        targetSdk = libs.versions.targetSdk.get().toInt()
        versionCode = 1
        versionName = "1.0.0"

        // Read APP_SECRET from local.properties for backend authentication
        val localProps = java.util.Properties().apply {
            val localFile = rootProject.file("local.properties")
            if (localFile.exists()) load(localFile.inputStream())
        }
        val appSecret = localProps.getProperty("APP_SECRET", "")
        buildConfigField("String", "APP_SECRET", "\"$appSecret\"")
    }

    signingConfigs {
        create("release") {
            // Placeholder: replace with real keystore before Play upload
            storeFile = file("release.keystore")
            storePassword = System.getenv("STORE_PASSWORD") ?: "placeholder"
            keyAlias = System.getenv("KEY_ALIAS") ?: "placeholder"
            keyPassword = System.getenv("KEY_PASSWORD") ?: "placeholder"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    bundle {
        language {
            enableSplit = false
        }
        density {
            enableSplit = true
        }
        abi {
            enableSplit = true
        }
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
        buildConfig = true
    }
}

dependencies {
    implementation(project(":domain"))
    implementation(project(":data"))
    implementation(project(":player"))
    implementation(project(":ai"))
    implementation(project(":ui"))
    implementation(project(":feature:favorites"))
    implementation(project(":feature:history"))
    
    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.androidx.activity.compose)
    
    // Compose TV
    implementation(libs.compose.tv.foundation)
    implementation(libs.compose.tv.material)
    
    // Media3
    implementation(libs.media3.exoplayer)
    implementation(libs.media3.session)
    implementation(libs.media3.ui)
    
    // Android TV Provider (Watch Next / Recommendations)
    implementation(libs.tvprovider)
    
    // Navigation
    implementation(libs.navigation.compose)
    implementation(libs.hilt.navigation.compose)
    
    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    
    // Coroutines
    implementation(libs.coroutines.android)
    implementation(libs.coroutines.core)

    // Material
    implementation(libs.material)

    // Network (needed for NetworkModule in app module)
    implementation(libs.okhttp.logging)
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.kotlinx.serialization.json)

    // Room (needed for DatabaseModule in app module)
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)

    // WorkManager
    implementation(libs.work.runtime)
    implementation(libs.hilt.work)
    ksp(libs.hilt.work.compiler)
}
