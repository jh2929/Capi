plugins {
    alias(libs.plugins.kotlin.jvm) apply (false)
    alias(libs.plugins.kotlin.serialization) apply (false)
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

