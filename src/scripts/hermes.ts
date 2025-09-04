import {PlatformSpecificScript} from "./runtime.ts";
import fs from "node:fs";

// Note: The `$x` variable is a placeholder for the runtime command (e.g., `npx`).
// Note: The `$m` variable is a placeholder for the runtime command (e.g., `npm`).

const entryFile = (() => {
    if (fs.existsSync("index.tsx")) {
        return "index.tsx";
    } else if (fs.existsSync("index.js")) {
        return "index.js";
    }
    return "index.jsx";
})();

export const bundleAndroidScript = new PlatformSpecificScript({
    win32:
        // Create output directories if they don't exist.
        '((if not exist "dist" mkdir "dist") && (if not exist "dist\\android" mkdir "dist\\android") && (if not exist "dist\\sentry" mkdir "dist\\sentry")) && ' +
        // Bundle JS and assets for Android using React Native bundler with source map.
        `$x react-native bundle --platform android --minify=true --entry-file ${entryFile} --bundle-output "dist\\android\\index.android.bundle" --sourcemap-output "dist\\sentry\\index.android.bundle.map" --dev false --assets-dest "dist\\android" && ` +
        // Copy bundle for Sentry
        'copy "dist\\android\\index.android.bundle" "dist\\sentry\\index.android.bundle" && ' +
        // Compile the JS bundle to Hermes bytecode.
        'node_modules\\react-native\\sdks\\hermesc\\win64-bin\\hermesc.exe -emit-binary -out "dist\\android\\index.android.hbc.bundle" "dist\\android\\index.android.bundle" -output-source-map -w && ' +
        // Copy Hermes source map to Sentry folder for composition
        'copy "dist\\android\\index.android.hbc.bundle.map" "dist\\sentry\\index.android.bundle.hbc.map" && ' +
        // Delete the original JS bundle and its source map from android folder.
        'del /F /Q "dist\\android\\index.android.bundle" "dist\\android\\index.android.hbc.bundle.map" && ' +
        // Change to 'dist', zip the 'android' folder contents, then return to original directory.
        '(pushd "dist" && powershell -Command "Compress-Archive -Path \'.\\android\' -DestinationPath \'.\\hermes.android.hbc.zip\' -Force" && popd) && ' +
        // Remove the temporary 'dist/android' directory.
        'rmdir /S /Q "dist\\android"',
    linux:
        // Create output directory 'dist/android' and 'dist/sentry', including parents if necessary.
        "mkdir -p dist/android dist/sentry && " +
        // Bundle JS and assets for Android using React Native bundler with source map.
        `$x react-native bundle --platform android --minify=true --entry-file ${entryFile} --bundle-output dist/android/index.android.bundle --sourcemap-output dist/sentry/index.android.bundle.map --dev false  --assets-dest dist/android && ` +
        // Copy bundle for Sentry
        "cp dist/android/index.android.bundle dist/sentry/index.android.bundle && " +
        // Compile the JS bundle to Hermes bytecode.
        "./node_modules/react-native/sdks/hermesc/linux64-bin/hermesc -emit-binary -out dist/android/index.android.hbc.bundle dist/android/index.android.bundle -output-source-map -w && " +
        // Copy Hermes source map to Sentry folder for composition
        "cp dist/android/index.android.hbc.bundle.map dist/sentry/index.android.bundle.hbc.map && " +
        // Delete the original JS bundle and its source map from android folder.
        "rm -f dist/android/index.android.bundle dist/android/index.android.hbc.bundle.map && " +
        // Change to 'dist' directory.
        "cd dist && " +
        // Find all files in 'android' subdir and pipe them to zip to create 'hermes.android.hbc.zip'.
        "find android -type f | zip hermes.android.hbc.zip -@ && " +
        // Return to the parent directory (project root).
        "cd .. && " +
        // Remove the temporary 'dist/android' directory and its contents.
        "rm -rf dist/android",
    darwin:
        // Create output directory 'dist/android' and 'dist/sentry', including parents if necessary.
        "mkdir -p dist/android dist/sentry && " +
        // Bundle JS and assets for Android using React Native bundler with source map.
        `$x react-native bundle --platform android --minify=true --entry-file ${entryFile} --bundle-output dist/android/index.android.bundle --sourcemap-output dist/sentry/index.android.bundle.map --dev false  --assets-dest dist/android && ` +
        // Copy bundle for Sentry
        "cp dist/android/index.android.bundle dist/sentry/index.android.bundle && " +
        // Compile the JS bundle to Hermes bytecode.
        "./node_modules/react-native/sdks/hermesc/osx-bin/hermesc -emit-binary -out dist/android/index.android.hbc.bundle dist/android/index.android.bundle -output-source-map -w && " +
        // Copy Hermes source map to Sentry folder for composition
        "cp dist/android/index.android.hbc.bundle.map dist/sentry/index.android.bundle.hbc.map && " +
        // Delete the original JS bundle and its source map from android folder.
        "rm -f dist/android/index.android.bundle dist/android/index.android.hbc.bundle.map && " +
        // Change to 'dist' directory.
        "cd dist && " +
        // Find all files in 'android' subdir and pipe them to zip to create 'hermes.android.hbc.zip'.
        "find android -type f | zip hermes.android.hbc.zip -@ && " +
        // Return to the parent directory (project root).
        "cd .. && " +
        // Remove the temporary 'dist/android' directory and its contents.
        "rm -rf dist/android",
});

export const bundleIosScript = new PlatformSpecificScript({
    win32:
        // Create output directories if they don't exist.
        '((if not exist "dist" mkdir "dist") && (if not exist "dist\\ios" mkdir "dist\\ios") && (if not exist "dist\\sentry" mkdir "dist\\sentry")) && ' +
        // Bundle JS and assets for iOS using React Native bundler with source map.
        `$x react-native bundle --platform ios --minify=true --entry-file ${entryFile} --bundle-output "dist\\ios\\main.jsbundle" --sourcemap-output "dist\\sentry\\main.ios.jsbundle.map" --dev false --assets-dest "dist\\ios" && ` +
        // Copy bundle for Sentry
        'copy "dist\\ios\\main.jsbundle" "dist\\sentry\\main.ios.jsbundle" && ' +
        // Compile the JS bundle to Hermes bytecode.
        'node_modules\\react-native\\sdks\\hermesc\\win64-bin\\hermesc.exe -emit-binary -out "dist\\ios\\main.ios.hbc.jsbundle" "dist\\ios\\main.jsbundle" -output-source-map -w && ' +
        // Copy Hermes source map to Sentry folder for composition
        'copy "dist\\ios\\main.ios.hbc.jsbundle.map" "dist\\sentry\\main.ios.jsbundle.hbc.map" && ' +
        // Delete the original JS bundle and its source map from ios folder.
        'del /F /Q "dist\\ios\\main.jsbundle" "dist\\ios\\main.ios.hbc.jsbundle.map" && ' +
        // Change to 'dist', zip the 'ios' folder contents, then return to original directory.
        '(pushd "dist" && powershell -Command "Compress-Archive -Path \'.\\ios\' -DestinationPath \'.\\hermes.ios.hbc.zip\' -Force" && popd) && ' +
        // Remove the temporary 'dist/ios' directory.
        'rmdir /S /Q "dist\\ios"',
    linux:
        // Create output directory 'dist/ios' and 'dist/sentry', including parents if necessary.
        "mkdir -p dist/ios dist/sentry && " +
        // Bundle JS and assets for iOS using React Native bundler with source map.
        `$x react-native bundle --platform ios --minify=true --entry-file ${entryFile} --bundle-output dist/ios/main.jsbundle --sourcemap-output dist/sentry/main.ios.jsbundle.map --dev false --assets-dest dist/ios && ` +
        // Copy bundle for Sentry
        "cp dist/ios/main.jsbundle dist/sentry/main.ios.jsbundle && " +
        // Compile the JS bundle to Hermes bytecode.
        "./node_modules/react-native/sdks/hermesc/linux64-bin/hermesc -emit-binary -out dist/ios/main.ios.hbc.jsbundle dist/ios/main.jsbundle -output-source-map -w && " +
        // Copy Hermes source map to Sentry folder for composition
        "cp dist/ios/main.ios.hbc.jsbundle.map dist/sentry/main.ios.jsbundle.hbc.map && " +
        // Delete the original JS bundle and its source map from ios folder.
        "rm -f dist/ios/main.jsbundle dist/ios/main.ios.hbc.jsbundle.map && " +
        // Change to 'dist' directory.
        "cd dist && " +
        // Find all files in 'ios' subdir and pipe them to zip to create 'hermes.ios.hbc.zip'.
        "find ios -type f | zip hermes.ios.hbc.zip -@ && " +
        // Return to the parent directory (project root).
        "cd .. && " +
        // Remove the temporary 'dist/ios' directory and its contents.
        "rm -rf dist/ios",
    darwin:
        // Create output directory 'dist/ios' and 'dist/sentry', including parents if necessary.
        "mkdir -p dist/ios dist/sentry && " +
        // Bundle JS and assets for iOS using React Native bundler with source map.
        `$x react-native bundle --platform ios --minify=true --entry-file ${entryFile} --bundle-output dist/ios/main.jsbundle --sourcemap-output dist/sentry/main.ios.jsbundle.map --dev false --assets-dest dist/ios && ` +
        // Copy bundle for Sentry
        "cp dist/ios/main.jsbundle dist/sentry/main.ios.jsbundle && " +
        // Compile the JS bundle to Hermes bytecode.
        "./node_modules/react-native/sdks/hermesc/osx-bin/hermesc -emit-binary -out dist/ios/main.ios.hbc.jsbundle dist/ios/main.jsbundle -output-source-map -w && " +
        // Copy Hermes source map to Sentry folder for composition
        "cp dist/ios/main.ios.hbc.jsbundle.map dist/sentry/main.ios.jsbundle.hbc.map && " +
        // Delete the original JS bundle and its source map from ios folder.
        "rm -f dist/ios/main.jsbundle dist/ios/main.ios.hbc.jsbundle.map && " +
        // Change to 'dist' directory.
        "cd dist && " +
        // Find all files in 'ios' subdir and pipe them to zip to create 'hermes.ios.hbc.zip'.
        "find ios -type f | zip hermes.ios.hbc.zip -@ && " +
        // Return to the parent directory (project root).
        "cd .. && " +
        // Remove the temporary 'dist/ios' directory and its contents.
        "rm -rf dist/ios",
});
