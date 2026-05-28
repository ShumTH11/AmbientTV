pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "0.10.0"
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
        maven("https://mvn.0110.be/releases")
    }
}

rootProject.name = "AmbientTV"

enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")

include(":app")
include(":domain")
include(":data")
include(":player")
include(":ai")
include(":ui")
include(":feature:favorites")
include(":feature:history")
