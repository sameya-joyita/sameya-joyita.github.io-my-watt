#include <Arduino.h>
#include <lvgl.h>
#include "display.h"
#include "esp_bsp.h"
#include "lv_port.h"
#include "home_screen.h"
#include <WiFi.h>
#include <time.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define LVGL_PORT_ROTATION_DEGREE (90)
#define API_UPDATE_INTERVAL 30000  // 30 seconds

// API endpoints and key
const char* apiEndpointCurrent = "https://power-k32c5ey90-sameyas-projects.vercel.app/api/current";
const char* apiEndpointDaily = "https://power-k32c5ey90-sameyas-projects.vercel.app/api/daily-usage";
const char* apiKey = "supersecretapikey123";

lv_obj_t *current_screen;
lv_obj_t *wifi_label;
lv_obj_t *title_label;
lv_obj_t *time_label;

// Power data
float current_power_kw = 0.0;
float daily_energy_kwh = 0.0;
float daily_cost = 0.0;
float current_rate = 0.0;  // Added to store the current rate from API
unsigned long last_api_update = 0;
bool is_loading_data = false;  // Flag to track if currently loading data
bool view_changed = false;  // Flag to indicate view just changed

// Time settings
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0;
const int daylightOffset_sec = 3600;

// Style for labels and buttons
static lv_style_t style_label;
//static lv_style_t style_button;

// Function to fetch current power data from API
void fetchCurrentPowerData() {
    is_loading_data = true;
    // Show loading indicator
    if (!home_screen_is_daily_view()) {
        home_screen_show_loading();
    }    
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String url = String(apiEndpointCurrent) + "?api_key=" + String(apiKey);
        
        http.begin(url.c_str());  // Use c_str() to convert String to const char*
        int httpResponseCode = http.GET();

        if (httpResponseCode == 200) {
            String payload = http.getString();
            Serial.println("Current Power API Response: " + payload);
            // Parse JSON
            DynamicJsonDocument doc(1024);
            DeserializationError error = deserializeJson(doc, payload);     
            if (!error) {
                // Extract power data and rate
                if (doc.containsKey("power_kw")) {
                    current_power_kw = doc["power_kw"].as<float>();
                    Serial.print("Current power: ");
                    Serial.println(current_power_kw);
                    
                    // Extract rate
                    if (doc.containsKey("rate")) {
                        current_rate = doc["rate"].as<float>();
                        Serial.print("Current rate: ");
                        Serial.println(current_rate);
                    }
                    // Only update display if in current view mode
                    if (!home_screen_is_daily_view()) {
                        home_screen_update_power(current_power_kw, current_rate);
                    }
                }
            } else {
                Serial.print("JSON parsing error: ");
                Serial.println(error.c_str());
            }
        } else {
            Serial.print("HTTP Error: ");
            Serial.println(httpResponseCode);
        }     
        http.end();
    }
    is_loading_data = false;
}

// Function to fetch daily usage data from API
void fetchDailyUsageData() {
    is_loading_data = true;
    
    // Show loading indicator
    if (home_screen_is_daily_view()) {
        home_screen_show_loading();
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        String url = String(apiEndpointDaily) + "?api_key=" + String(apiKey);
        
        http.begin(url.c_str());  // Use c_str() to convert String to const char*
        int httpResponseCode = http.GET();
        
        if (httpResponseCode == 200) {
            String payload = http.getString();
            Serial.println("Daily Usage API Response: " + payload);
            
            // Parse JSON
            DynamicJsonDocument doc(1024);
            DeserializationError error = deserializeJson(doc, payload);
            
            if (!error) {
                // Extract daily usage data
                if (doc.containsKey("total_energy_day") && doc.containsKey("total_cost_day")) {
                    daily_energy_kwh = doc["total_energy_day"].as<float>();
                    daily_cost = doc["total_cost_day"].as<float>();
                    Serial.print("Daily energy: ");
                    Serial.println(daily_energy_kwh);
                    Serial.print("Daily cost: ");
                    Serial.println(daily_cost);
                    
                    // Only update display if in daily view mode
                    if (home_screen_is_daily_view()) {
                        home_screen_update_daily_usage(daily_energy_kwh, daily_cost);
                    }
                }
            } else {
                Serial.print("JSON parsing error: ");
                Serial.println(error.c_str());
            }
        } else {
            Serial.print("HTTP Error: ");
            Serial.println(httpResponseCode);
        }
        
        http.end();
    }
    
    is_loading_data = false;
}

// Fetch appropriate data based on current view
void fetchPowerData() {
    if (home_screen_is_daily_view()) {
        fetchDailyUsageData();
    } else {
        fetchCurrentPowerData();
    }
}

// Update WiFi status and time every second
static void update_top_bar(lv_timer_t *timer) {
    // Update the time
    if (time_label) {
        struct tm timeinfo;
        if(getLocalTime(&timeinfo)) {
            char time_str[9]; // HH:MM:SS + null terminator
            sprintf(time_str, "%02d:%02d:%02d", timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
            lv_label_set_text(time_label, time_str);
        }
    }

    // Update WiFi status
    if (wifi_label) {
        if (WiFi.status() == WL_CONNECTED) { // Directly using WiFi status from WiFi.h
            lv_label_set_text(wifi_label, LV_SYMBOL_WIFI);
        } else {
            lv_label_set_text(wifi_label, LV_SYMBOL_WARNING);
        }
    }
    
    // Check if view was just changed or if it's time for a regular update
    unsigned long current_millis = millis();
    if ((view_changed || current_millis - last_api_update > API_UPDATE_INTERVAL) && !is_loading_data) {
        view_changed = false;
        last_api_update = current_millis;
        
        // Check which view we're in and fetch appropriate data
        fetchPowerData();
    }
}

void setup() {
    String title = "MyWatt";

    Serial.begin(115200);
    Serial.println(title + " start");

    Serial.println("Initialize panel device");
    bsp_display_cfg_t cfg = {
        .lvgl_port_cfg = ESP_LVGL_PORT_INIT_CONFIG(),
        .buffer_size = EXAMPLE_LCD_QSPI_H_RES * EXAMPLE_LCD_QSPI_V_RES,
    #if LVGL_PORT_ROTATION_DEGREE == 90
        .rotate = LV_DISP_ROT_90,
    #elif LVGL_PORT_ROTATION_DEGREE == 270
        .rotate = LV_DISP_ROT_270,
    #elif LVGL_PORT_ROTATION_DEGREE == 180
        .rotate = LV_DISP_ROT_180,
    #elif LVGL_PORT_ROTATION_DEGREE == 0
        .rotate = LV_DISP_ROT_NONE,
    #endif
    };

    bsp_display_start_with_config(&cfg);
    bsp_display_backlight_on();

    Serial.println("Create UI");
    bsp_display_lock(0);

    // Create a parent container for the current screen
    current_screen = lv_obj_create(NULL);

    // Create the top bar container
    lv_obj_t *top_bar = lv_obj_create(current_screen);
    lv_obj_set_size(top_bar, lv_pct(100), 40); // Full width, 40 pixels height
    lv_obj_align(top_bar, LV_ALIGN_TOP_MID, 0, 0);
    lv_obj_set_style_bg_color(top_bar, lv_color_hex(0x000000), 0); // Black background
    lv_obj_set_style_pad_all(top_bar, 5, 0);

    // Initialize label style
    lv_style_init(&style_label);
    lv_style_set_text_font(&style_label, &lv_font_montserrat_20); // Set font size to 20
    lv_style_set_text_color(&style_label, lv_color_white()); // Set text color to white

    // Create the WiFi status icon
    wifi_label = lv_label_create(top_bar);
    lv_label_set_text(wifi_label, LV_SYMBOL_WIFI);
    lv_obj_align(wifi_label, LV_ALIGN_LEFT_MID, 10, 0); // Align to the left
    lv_obj_add_style(wifi_label, &style_label, 0);

    // Create the title label
    title_label = lv_label_create(top_bar);
    lv_label_set_text(title_label, "MyWatt");
    lv_obj_align(title_label, LV_ALIGN_CENTER, 0, 0); // Align to the center
    lv_obj_add_style(title_label, &style_label, 0);

    // Create the time display
    time_label = lv_label_create(top_bar);
    lv_obj_align(time_label, LV_ALIGN_RIGHT_MID, -10, 0); // Align to the right
    lv_obj_add_style(time_label, &style_label, 0);

    // Initialize the home screen
    home_screen_create(current_screen);
    lv_scr_load(current_screen); // Load the home screen

    // Create a timer to update the WiFi status and time every second
    lv_timer_create(update_top_bar, 1000, NULL);

    bsp_display_unlock();

    Serial.println(title + " end");

    Serial.print("Connecting to Wi-Fi...");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nConnected to Wi-Fi!");
    
    // Initialize NTP time synchronization
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    
    // Initial API data fetch - start with daily view
    home_screen_toggle_view(true); // Set to daily view by default
    fetchPowerData();
}

void loop() {
    lv_task_handler();
    delay(10); // Shorter delay for better responsiveness
}