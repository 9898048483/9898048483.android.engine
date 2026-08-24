#include "../include/ai_engine/locale_detector.hpp"
#include <sys/system_properties.h>
#include <clocale>
#include <algorithm>
#include <sstream>
#include <cstring>
#include <android/log.h>

#define LOCALE_LOG_TAG "AI_LOCALE"
#define LOG_LOCALE_I(...) __android_log_print(ANDROID_LOG_INFO, LOCALE_LOG_TAG, __VA_ARGS__)

namespace ai_engine {
namespace locale {

LocaleDetector::LocaleDetector() {
    initializeIsoMaps();
}

void LocaleDetector::initializeIsoMaps() {
    iso639_1_to_2_map_ = {
        {"en", "eng"}, {"es", "spa"}, {"fr", "fra"}, {"de", "deu"},
        {"hi", "hin"}, {"ja", "jpn"}, {"zh", "zho"}, {"ar", "ara"},
        {"ru", "rus"}, {"pt", "por"}, {"bn", "ben"}, {"ur", "urd"},
        {"it", "ita"}, {"ko", "kor"}, {"id", "ind"}, {"vi", "vie"},
        {"ta", "tam"}, {"te", "tel"}, {"mr", "mar"}, {"gu", "guj"}
    };

    iso639_1_to_name_map_ = {
        {"en", "English"}, {"es", "Spanish (Español)"}, {"fr", "French (Français)"},
        {"de", "German (Deutsch)"}, {"hi", "Hindi (हिन्दी)"}, {"ja", "Japanese (日本語)"},
        {"zh", "Chinese (中文)"}, {"ar", "Arabic (العربية)"}, {"ru", "Russian (Русский)"},
        {"pt", "Portuguese (Português)"}, {"bn", "Bengali (বাংলা)"}, {"ur", "Urdu (اردو)"},
        {"it", "Italian (Italiano)"}, {"ko", "Korean (한국어)"}, {"id", "Indonesian (Bahasa Indonesia)"},
        {"vi", "Vietnamese (Tiếng Việt)"}, {"ta", "Tamil (தமிழ்)"}, {"te", "Telugu (తెలుగు)"},
        {"mr", "Marathi (मराठी)"}, {"gu", "Gujarati (ગુજરાતી)"}
    };

    country_to_currency_map_ = {
        {"US", "USD"}, {"GB", "GBP"}, {"IN", "INR"}, {"JP", "JPY"},
        {"DE", "EUR"}, {"FR", "EUR"}, {"CN", "CNY"}, {"BR", "BRL"},
        {"AE", "AED"}, {"SA", "SAR"}, {"KR", "KRW"}, {"RU", "RUB"}
    };
}

std::string LocaleDetector::readAndroidSystemProperty(const char* propKey) {
    char propValue[PROP_VALUE_MAX] = {0};
    int len = __system_property_get(propKey, propValue);
    if (len > 0) {
        return std::string(propValue, len);
    }
    return "";
}

bool LocaleDetector::isRightToLeft(const std::string& langCode) {
    std::string lower = langCode;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
    return (lower == "ar" || lower == "he" || lower == "ur" || lower == "fa" || lower == "ps" || lower == "yi");
}

IsoLocaleInfo LocaleDetector::parseAndNormalizeLocale(const std::string& rawLocaleString) {
    IsoLocaleInfo info;
    if (rawLocaleString.empty()) {
        info.bcp47Tag = "en-US";
        info.languageIso639_1 = "en";
        info.languageIso639_2 = "eng";
        info.scriptIso15924 = "Latn";
        info.countryIso3166_1 = "US";
        info.displayName = "English (United States)";
        info.isRTL = false;
        info.currencyCode = "USD";
        info.timezoneName = "UTC";
        return info;
    }

    // Standardize separators ('_' -> '-')
    std::string normalized = rawLocaleString;
    std::replace(normalized.begin(), normalized.end(), '_', '-');

    // Split components: language-Script-REGION or language-REGION
    std::stringstream ss(normalized);
    std::string token;
    std::vector<std::string> parts;
    while (std::getline(ss, token, '-')) {
        if (!token.empty()) parts.push_back(token);
    }

    if (!parts.empty()) {
        info.languageIso639_1 = parts[0];
        std::transform(info.languageIso639_1.begin(), info.languageIso639_1.end(), info.languageIso639_1.begin(), ::tolower);
    } else {
        info.languageIso639_1 = "en";
    }

    // Resolve ISO 639-2
    auto it2 = iso639_1_to_2_map_.find(info.languageIso639_1);
    info.languageIso639_2 = (it2 != iso639_1_to_2_map_.end()) ? it2->second : (info.languageIso639_1 + "x");

    // Script and Region resolution
    if (parts.size() >= 3) {
        info.scriptIso15924 = parts[1];
        info.countryIso3166_1 = parts[2];
        std::transform(info.countryIso3166_1.begin(), info.countryIso3166_1.end(), info.countryIso3166_1.begin(), ::toupper);
    } else if (parts.size() == 2) {
        if (parts[1].length() == 4) {
            info.scriptIso15924 = parts[1];
            info.countryIso3166_1 = "US";
        } else {
            info.scriptIso15924 = (info.languageIso639_1 == "zh") ? "Hans" : "Latn";
            info.countryIso3166_1 = parts[1];
            std::transform(info.countryIso3166_1.begin(), info.countryIso3166_1.end(), info.countryIso3166_1.begin(), ::toupper);
        }
    } else {
        info.scriptIso15924 = "Latn";
        info.countryIso3166_1 = "US";
    }

    // BCP 47 Canonical Tag
    if (!info.scriptIso15924.empty() && info.scriptIso15924 != "Latn" && info.languageIso639_1 != "en") {
        info.bcp47Tag = info.languageIso639_1 + "-" + info.scriptIso15924 + "-" + info.countryIso3166_1;
    } else {
        info.bcp47Tag = info.languageIso639_1 + "-" + info.countryIso3166_1;
    }

    // Display Name
    auto nameIt = iso639_1_to_name_map_.find(info.languageIso639_1);
    std::string baseName = (nameIt != iso639_1_to_name_map_.end()) ? nameIt->second : info.languageIso639_1;
    info.displayName = baseName + " [" + info.countryIso3166_1 + "]";

    info.isRTL = isRightToLeft(info.languageIso639_1);

    auto currIt = country_to_currency_map_.find(info.countryIso3166_1);
    info.currencyCode = (currIt != country_to_currency_map_.end()) ? currIt->second : "USD";
    info.timezoneName = "System/Default";

    return info;
}

IsoLocaleInfo LocaleDetector::detectCurrentLocale(JNIEnv* env) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (isCacheValid_) {
        return cachedLocale_;
    }

    // 1. Check Android system properties via Bionic
    std::string prop = readAndroidSystemProperty("persist.sys.locale");
    if (prop.empty()) {
        prop = readAndroidSystemProperty("ro.product.locale");
    }
    if (prop.empty()) {
        std::string lang = readAndroidSystemProperty("ro.product.locale.language");
        std::string reg = readAndroidSystemProperty("ro.product.locale.region");
        if (!lang.empty()) {
            prop = lang + (reg.empty() ? "" : ("-" + reg));
        }
    }

    // 2. POSIX locale fallback
    if (prop.empty()) {
        const char* envLocale = std::getenv("LC_ALL");
        if (!envLocale) envLocale = std::getenv("LANG");
        if (envLocale) {
            prop = std::string(envLocale);
            size_t dotPos = prop.find('.');
            if (dotPos != std::string::npos) prop = prop.substr(0, dotPos);
        }
    }

    // 3. JNI Java Locale fallback if env is provided
    if (prop.empty() && env) {
        jclass localeClass = env->FindClass("java/util/Locale");
        if (localeClass) {
            jmethodID getDefaultMethod = env->GetStaticMethodID(localeClass, "getDefault", "()Ljava/util/Locale;");
            if (getDefaultMethod) {
                jobject defaultLocale = env->CallStaticObjectMethod(localeClass, getDefaultMethod);
                if (defaultLocale) {
                    jmethodID toLanguageTagMethod = env->GetMethodID(localeClass, "toLanguageTag", "()Ljava/lang/String;");
                    if (toLanguageTagMethod) {
                        jstring tagStr = (jstring)env->CallObjectMethod(defaultLocale, toLanguageTagMethod);
                        if (tagStr) {
                            const char* tagChars = env->GetStringUTFChars(tagStr, nullptr);
                            prop = std::string(tagChars);
                            env->ReleaseStringUTFChars(tagStr, tagChars);
                        }
                    }
                    env->DeleteLocalRef(defaultLocale);
                }
            }
            env->DeleteLocalRef(localeClass);
        }
    }

    if (prop.empty()) {
        prop = "en-US";
    }

    cachedLocale_ = parseAndNormalizeLocale(prop);
    isCacheValid_ = true;
    LOG_LOCALE_I("Detected system locale at native layer: %s (BCP-47: %s)", prop.c_str(), cachedLocale_.bcp47Tag.c_str());
    return cachedLocale_;
}

std::vector<std::pair<std::string, std::string>> LocaleDetector::getSupportedLanguages() const {
    std::vector<std::pair<std::string, std::string>> list;
    for (const auto& item : iso639_1_to_name_map_) {
        list.push_back(item);
    }
    std::sort(list.begin(), list.end());
    return list;
}

} // namespace locale
} // namespace ai_engine
