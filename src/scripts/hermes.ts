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
        '((if not exist "dist" mkdir "dist") && (if not exist "dist\\android" mkdir "dist\\android")) && ' +
        // Bundle JS and assets for Android using React Native bundler.
        `$x react-native bundle --platform android --minify=true --entry-file ${entryFile} --bundle-output "dist\\android\\index.android.bundle" --dev false --assets-dest "dist\\android" && ` +
        // Compile the JS bundle to Hermes bytecode.
        'node_modules\\react-native\\sdks\\hermesc\\win64-bin\\hermesc.exe -emit-binary -out "dist\\android\\index.android.hbc.bundle" "dist\\android\\index.android.bundle" -output-source-map -w && ' +
        // Delete the original JS bundle and its source map.
        'del /F /Q "dist\\android\\index.android.bundle" "dist\\android\\index.android.hbc.bundle.map" && ' +
        // Change to 'dist', zip the 'android' folder contents, then return to original directory.
        '(pushd "dist" && powershell -Command "Compress-Archive -Path \'.\\android\' -DestinationPath \'.\\hermes.android.hbc.zip\' -Force" && popd) && ' +
        // Remove the temporary 'dist/android' directory.
        'rmdir /S /Q "dist\\android"',
    linux:
        // Create output directory 'dist/android', including parents if necessary.
        "mkdir -p dist/android && " +
        // Bundle JS and assets for Android using React Native bundler.
        `$x react-native bundle --platform android --minify=true --entry-file ${entryFile} --bundle-output dist/android/index.android.bundle --dev false  --assets-dest dist/android && ` +
        // Compile the JS bundle to Hermes bytecode.
        "./node_modules/react-native/sdks/hermesc/linux64-bin/hermesc -emit-binary -out dist/android/index.android.hbc.bundle dist/android/index.android.bundle -output-source-map -w && " +
        // Delete the original JS bundle and its source map.
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
        // Create output directory 'dist/android', including parents if necessary.
        "mkdir -p dist/android && " +
        // Bundle JS and assets for Android using React Native bundler.
        `$x react-native bundle --platform android --minify=true --entry-file ${entryFile} --bundle-output dist/android/index.android.bundle --dev false  --assets-dest dist/android && ` +
        // Compile the JS bundle to Hermes bytecode.
        "./node_modules/react-native/sdks/hermesc/osx-bin/hermesc -emit-binary -out dist/android/index.android.hbc.bundle dist/android/index.android.bundle -output-source-map -w && " +
        // Delete the original JS bundle and its source map.
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
        '((if not exist "dist" mkdir "dist") && (if not exist "dist\\ios" mkdir "dist\\ios")) && ' +
        // Bundle JS and assets for iOS using React Native bundler.
        `$x react-native bundle --platform ios --minify=true --entry-file ${entryFile} --bundle-output "dist\\ios\\main.jsbundle" --dev false --assets-dest "dist\\ios" && ` +
        // Compile the JS bundle to Hermes bytecode.
        'node_modules\\react-native\\sdks\\hermesc\\win64-bin\\hermesc.exe -emit-binary -out "dist\\ios\\main.ios.hbc.jsbundle" "dist\\ios\\main.jsbundle" -output-source-map -w && ' +
        // Delete the original JS bundle and its source map.
        'del /F /Q "dist\\ios\\main.jsbundle" "dist\\ios\\main.ios.hbc.jsbundle.map" && ' +
        // Change to 'dist', zip the 'ios' folder contents, then return to original directory.
        '(pushd "dist" && powershell -Command "Compress-Archive -Path \'.\\ios\' -DestinationPath \'.\\hermes.ios.hbc.zip\' -Force" && popd) && ' +
        // Remove the temporary 'dist/ios' directory.
        'rmdir /S /Q "dist\\ios"',
    linux:
        // Create output directory 'dist/ios', including parents if necessary.
        "mkdir -p dist/ios && " +
        // Bundle JS and assets for iOS using React Native bundler.
        `$x react-native bundle --platform ios --minify=true --entry-file ${entryFile} --bundle-output dist/ios/main.jsbundle --dev false --assets-dest dist/ios && ` +
        // Compile the JS bundle to Hermes bytecode.
        "./node_modules/react-native/sdks/hermesc/linux64-bin/hermesc -emit-binary -out dist/ios/main.ios.hbc.jsbundle dist/ios/main.jsbundle -output-source-map -w && " +
        // Delete the original JS bundle and its source map.
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
        // Create output directory 'dist/ios', including parents if necessary.
        "mkdir -p dist/ios && " +
        // Bundle JS and assets for iOS using React Native bundler.
        `$x react-native bundle --platform ios --minify=true --entry-file ${entryFile} --bundle-output dist/ios/main.jsbundle --dev false --assets-dest dist/ios && ` +
        // Compile the JS bundle to Hermes bytecode.
        "./node_modules/react-native/sdks/hermesc/osx-bin/hermesc -emit-binary -out dist/ios/main.ios.hbc.jsbundle dist/ios/main.jsbundle -output-source-map -w && " +
        // Delete the original JS bundle and its source map.
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
