plugins {
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.kotlin.jvm)
    id("application")
    id("org.graalvm.buildtools.native") version "0.10.2"
}

kotlin {
    jvmToolchain(21)
}

dependencies {
    implementation(project(":innertube"))
    implementation(project(":lrclib"))
    implementation(libs.ktor.client.cio)
    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.json)
}

application {
    mainClass.set("com.arturo254.opentune.core.MainKt")
}

graalvmNative {
    binaries {
        named("main") {
            imageName.set("opentune-core")
            mainClass.set("com.arturo254.opentune.core.MainKt")
            buildArgs.addAll(
                "--no-fallback",
                "--initialize-at-build-time=kotlin.DeprecationLevel",
                "--trace-class-initialization=kotlin.DeprecationLevel"
            )
        }
    }
    agent {
        defaultMode.set("standard")
    }
    metadataRepository {
        enabled.set(true)
    }
}
