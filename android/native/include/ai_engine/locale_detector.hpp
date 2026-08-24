#ifndef AI_ENGINE_LOCALE_DETECTOR_HPP
#define AI_ENGINE_LOCALE_DETECTOR_HPP

#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>
#include <jni.h>

namespace ai_engine {
namespace locale {

struct IsoLocaleInfo {
    std::string bcp47Tag;          // e.g., "en-US", "hi-IN", "ja-JP", "zh-Hans-CN"
    std::string languageIso639_1;  // 2-letter language (e.g., "en", "hi", "ja", "zh")
    std::string languageIso639_2;  // 3-letter language (e.g., "eng", "hin", "jpn", "zho")
    std::string scriptIso15924;    // 4-letter script (e.g., "Latn", "Deva", "Hans", "Hant")
    std::string countryIso3166_1;  // 2-letter country (e.g., "US", "IN", "JP", "CN")
    std::string displayName;       // Full human readable (e.g., "Hindi (India)")
    bool isRTL;                    // Right-to-Left writing direction (e.g., Arabic, Hebrew, Urdu)
    std::string currencyCode;      // e.g. "USD", "INR", "JPY"
    std::string timezoneName;      // e.g. "Asia/Kolkata", "America/New_York"
};

/**
 * @brief Native-level ISO language and locale detector reading Android system properties & POSIX locale.
 */
class LocaleDetector {
public:
    LocaleDetector();
    ~LocaleDetector() = default;

    /**
     * @brief Detects active device locale directly from Linux kernel / Android Bionic runtime
     * without crossing into JVM unless needed as a secondary fallback.
     */
    IsoLocaleInfo detectCurrentLocale(JNIEnv* env = nullptr);

    /**
     * @brief Formats or canonicalizes any arbitrary locale string into strict ISO / BCP-47 specs.
     */
    IsoLocaleInfo parseAndNormalizeLocale(const std::string& rawLocaleString);

    /**
     * @brief Returns list of all supported ISO-639-1 languages with localized display names.
     */
    std::vector<std::pair<std::string, std::string>> getSupportedLanguages() const;

    /**
     * @brief Checks if a given language tag is Right-to-Left (RTL).
     */
    static bool isRightToLeft(const std::string& langCode);

private:
    std::string readAndroidSystemProperty(const char* propKey);
    void initializeIsoMaps();

    mutable std::mutex mutex_;
    std::unordered_map<std::string, std::string> iso639_1_to_2_map_;
    std::unordered_map<std::string, std::string> iso639_1_to_name_map_;
    std::unordered_map<std::string, std::string> country_to_currency_map_;
    IsoLocaleInfo cachedLocale_;
    bool isCacheValid_{false};
};

} // namespace locale
} // namespace ai_engine

#endif // AI_ENGINE_LOCALE_DETECTOR_HPP
