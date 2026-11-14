# MetroFuse JioSaavn plugin

JioSaavn is an optional plugin for [MetroFuse KMP](https://github.com/956tris/MetroFuse/tree/KMP). This separate public repository contains its JavaScript and Kotlin source and build tools. Download the desktop JAR, Android APK and universal MFP from [GitHub Releases](https://github.com/956tris/MetroFuse-JioSaavn/releases/tag/v1.2.0).

Version 1.2.0 uses plugin API 1.1.0. It supplies Home shelves, search, metadata, album/artist/playlist lookup, audio resolution and persisted settings. It has no login capability. All formats use owner ID `metrofuse.jiosaavn`; install one implementation at a time.

| Platform | Package |
| --- | --- |
| Desktop | [jiosaavn.jar](https://github.com/956tris/MetroFuse-JioSaavn/releases/download/v1.2.0/jiosaavn.jar) |
| Android host | [jiosaavn.apk](https://github.com/956tris/MetroFuse-JioSaavn/releases/download/v1.2.0/jiosaavn.apk) |
| Desktop or Android | [jiosaavn.mfp](https://github.com/956tris/MetroFuse-JioSaavn/releases/download/v1.2.0/jiosaavn.mfp) |

Compare the downloaded file against [SHA256SUMS](https://github.com/956tris/MetroFuse-JioSaavn/releases/download/v1.2.0/SHA256SUMS). Open MetroFuse → Plugins or Settings → Plugins, import the package, then enable it. The APK is a plugin code container; import it inside MetroFuse rather than installing it as a separate Android application. Replacing formats retains that owner's settings.

`regionalCatalog` selects the India catalog by default. `previewEnabled` permits public previews when a full stream is unavailable. Catalog and audio availability depend on JioSaavn's responses and region. The plugin supplies no ambient host account session or DRM support.

## Build the universal MFP

From this repository, run the [PowerShell packer](tooling/pack-mfp.ps1) with `-Source ./javascript -Output ./build/plugin-examples/jiosaavn.mfp`. It writes payload SHA-256 hashes. The same MFP runs on desktop and Android.

## Build native JAR and APK

Install Java 25. Match Kotlin 2.4.21, Compose 1.13.0-beta02 and plugin API 1.1.0. Android packaging also needs SDK platform `android-37.0` and build tools `37.0.0`; configure `ANDROID_HOME` or untracked `local.properties`.

The host does not currently publish a Maven SDK. Obtain its API JAR by running `:plugin-api:desktopJar` in a separate [MetroFuse KMP checkout](https://github.com/956tris/MetroFuse/tree/KMP). The result is `plugin-api/build/libs/plugin-api-desktop-1.1.0.jar`. Keep the host checkout separate from this plugin repository.

In this plugin repository, run:

```powershell
./gradlew.bat :native:desktopTest :native:packagePluginJar :native:packagePluginApk '-PmetrofuseApiJar=../MetroFuse/plugin-api/build/libs/plugin-api-desktop-1.1.0.jar' --no-configuration-cache
```

Adjust the API JAR path to your host checkout. On Linux/macOS use `./gradlew`. Outputs are `build/plugin-examples/jiosaavn.jar` and `jiosaavn.apk`. Host API, Kotlin, Compose, coroutines and serialization libraries are compile-only for plugin code and are excluded from these artifacts. Native provider tests add the matching libraries on their own test runtime classpath.

## Verify and distribute

After building all three formats, run `python tooling/verify.py --check-source --write-checksums` to check archive structure, manifests and MFP hashes and create `build/plugin-examples/SHA256SUMS`. To verify downloaded release files, put all four files in one folder and run `python tooling/verify.py --directory <download-folder>`. Keep compiled files out of Git and upload them to a versioned GitHub release. Native regression tests cover catalog, media and partial-search behavior without service requests. Test the actual package in MetroFuse on every platform you claim. APK compilation does not establish Android device playback. JioSaavn has no credential form to test.

See the separate [plugin authoring guide](https://github.com/956tris/MetroFuse-Plugin-Docs) for core Home/login contracts, ownership, lifecycle and troubleshooting. Neither the app nor the documentation installs this plugin automatically.

Preserve [GPL-3.0](LICENSE), [JavaScript provenance](javascript/SOURCE) and [native provenance](native/SOURCE). Original Metrolist Project contributors retain credit for provider parsing, media decoding and quality selection. Source derives from the MetroFuse KMP Home implementation in commit ec041bba394fe38c38c6b674f9a608bc9f9de499, with this repository's independent build configuration.
