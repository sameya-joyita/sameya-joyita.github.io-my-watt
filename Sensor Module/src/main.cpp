#include <WiFi.h>
#include <HTTPClient.h>
#include <EmonLib.h>
#include <time.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>

// WiFi credentials
const char* ssid = "VM9418238";
const char* password = "tvnv5SjHwkfp";

// API endpoint
const char* apiEndpoint = "https://power-k32c5ey90-sameyas-projects.vercel.app/api/upload?api_key=supersecretapikey123";

// Device ID (UUID)
const char* deviceId = "b651114b-afdd-4815-876a-c83f22759e64"; 

// NTP Server for accurate timestamps
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 0; // GMT+0 for UK
const int daylightOffset_sec = 3600; 

// CT Sensor Config
#define CT_PIN 34          // ADC pin where CT sensor is connected
#define CALIBRATION 54.0   
#define VOLTAGE 230.0      // UK mains voltage (V)

// Timing parameters
const unsigned long MEASUREMENT_INTERVAL = 1000; // Take a reading every 1 second
const int READINGS_TO_UPLOAD = 30;              // Upload every 30 readings (30 seconds)
const int STABILIZATION_PERIOD = 10;            // Number of readings to discard at startup
const unsigned long WIFI_RECONNECT_INTERVAL = 30000; // Try to reconnect WiFi every 30 seconds

// Energy monitoring instance
EnergyMonitor emon1;

// Variables for measurements
float currentReadings[READINGS_TO_UPLOAD];
float powerReadings[READINGS_TO_UPLOAD];
unsigned long lastMeasurementTime = 0;
unsigned long lastWiFiReconnectAttempt = 0;
int readingIndex = 0;
float totalEnergy_kWh = 0;
int stabilizationCount = 0;
bool isStabilized = false;

// Buffer for storing readings when WiFi is disconnected
#define MAX_BUFFERED_READINGS 50 // Buffer up to 50 readings (25 minutes) when offline
struct ReadingData {
  String timestamp;
  float power_kw;
  float energy_kwh;
  bool valid;
};
ReadingData bufferedReadings[MAX_BUFFERED_READINGS];
int bufferIndex = 0;
int bufferCount = 0;

// File for persistent storage if needed
const char* dataFile = "/energy_data.json";

// Forward declarations of functions
void connectToWiFi();
void uploadBufferedReadings();
void saveBufferedReadingsToFile();
bool uploadSingleReading(String timestamp, float power_kw, float energy_kwh);

// Function to get current time as ISO 8601 string (with timezone)
String getISOTimeString() {
  struct tm timeinfo;
  char timeStringBuff[30];
  
  if(!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return "0000-00-00T00:00:00Z"; // Return default if time fetch fails
  }
  
  strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%S%z", &timeinfo);
  
  // Format timezone correctly for ISO 8601 (insert colon between hours and minutes)
  String timeString = String(timeStringBuff);
  if (timeString.length() > 22) {
    timeString = timeString.substring(0, timeString.length()-2) + ":" + 
                 timeString.substring(timeString.length()-2);
  } else {
    timeString += "Z"; // If no timezone is available, use UTC
  }
  
  return timeString;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("ESP32 Energy Monitor Starting...");

  // Initialize SPIFFS for data storage
  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS initialization failed!");
  } else {
    Serial.println("SPIFFS initialized successfully");
  }
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize NTP time
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  // Initialize energy monitor(emonlib)
  emon1.current(CT_PIN, CALIBRATION);

  Serial.println("System initialized. Waiting for sensor stabilization...");
  lastMeasurementTime = millis();
}

void connectToWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  // Wait up to 10 seconds for connection
  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 20) {
    delay(500);
    Serial.print(".");
    attempt++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    // Upload any buffered readings if we have them
    uploadBufferedReadings();
  } else {
    Serial.println("\nWiFi connection failed. Will retry later.");
  }
}

// Function to handle WiFi disconnection
void checkWiFiConnection() {
  unsigned long currentMillis = millis();
  
  if (WiFi.status() != WL_CONNECTED) {
    // Try to reconnect if WIFI_RECONNECT_INTERVAL has passed
    if (currentMillis - lastWiFiReconnectAttempt >= WIFI_RECONNECT_INTERVAL) {
      Serial.println("WiFi disconnected. Attempting to reconnect...");
      lastWiFiReconnectAttempt = currentMillis;
      WiFi.disconnect();
      connectToWiFi();
    }
  }
}

// Function to upload a single reading
bool uploadSingleReading(String timestamp, float power_kw, float energy_kwh) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }
  
  HTTPClient http;
  http.begin(apiEndpoint);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON document - using JsonDocument instead of DynamicJsonDocument
  JsonDocument doc;
  doc["time"] = timestamp;
  doc["device_id"] = deviceId;
  doc["power_kw"] = power_kw;
  doc["energy_kwh"] = energy_kwh;
  
  String requestBody;
  serializeJson(doc, requestBody);
  
  Serial.print("Uploading data: ");
  Serial.println(requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.println(response);
    http.end();
    return true;
  } else {
    Serial.print("Error on sending POST: ");
    Serial.println(httpResponseCode);
    http.end();
    return false;
  }
}

// Function to buffer readings when WiFi is disconnected
void bufferReading(float power_kw, float energy_kwh) {
  // Check if buffer is full
  if (bufferCount >= MAX_BUFFERED_READINGS) {
    // If buffer is full, overwrite oldest entry
    bufferIndex = (bufferIndex + 1) % MAX_BUFFERED_READINGS;
  } else {
    // If buffer is not full, increment counter
    bufferCount++;
  }
  
  // Store reading
  bufferedReadings[bufferIndex].timestamp = getISOTimeString();
  bufferedReadings[bufferIndex].power_kw = power_kw;
  bufferedReadings[bufferIndex].energy_kwh = energy_kwh;
  bufferedReadings[bufferIndex].valid = true;
  
  // Increment buffer index
  bufferIndex = (bufferIndex + 1) % MAX_BUFFERED_READINGS;
  
  Serial.print("Reading buffered. Total buffered readings: ");
  Serial.println(bufferCount);
  
  // Save to SPIFFS as backup
  saveBufferedReadingsToFile();
}

// Function to save buffered readings to file
void saveBufferedReadingsToFile() {
  File file = SPIFFS.open(dataFile, FILE_WRITE);
  if (!file) {
    Serial.println("Failed to open file for writing");
    return;
  }
  
  // Using JsonDocument instead of DynamicJsonDocument
  JsonDocument doc;
  JsonArray readings = doc["readings"].to<JsonArray>();
  
  for (int i = 0; i < bufferCount; i++) {
    int idx = (bufferIndex - bufferCount + i + MAX_BUFFERED_READINGS) % MAX_BUFFERED_READINGS;
    if (bufferedReadings[idx].valid) {
      JsonObject reading = readings.add<JsonObject>();
      reading["timestamp"] = bufferedReadings[idx].timestamp;
      reading["power_kw"] = bufferedReadings[idx].power_kw;
      reading["energy_kwh"] = bufferedReadings[idx].energy_kwh;
    }
  }
  
  serializeJson(doc, file);
  file.close();
  Serial.println("Buffered readings saved to file");
}

// Function to upload buffered readings
void uploadBufferedReadings() {
  if (bufferCount == 0) {
    return; // No buffered readings to upload
  }
  
  Serial.print("Uploading ");
  Serial.print(bufferCount);
  Serial.println(" buffered readings...");
  
  int successCount = 0;
  
  for (int i = 0; i < bufferCount; i++) {
    int idx = (bufferIndex - bufferCount + i + MAX_BUFFERED_READINGS) % MAX_BUFFERED_READINGS;
    if (bufferedReadings[idx].valid) {
      if (uploadSingleReading(bufferedReadings[idx].timestamp, 
                              bufferedReadings[idx].power_kw, 
                              bufferedReadings[idx].energy_kwh)) {
        bufferedReadings[idx].valid = false; // Mark as uploaded
        successCount++;
      } else {
        // If upload fails, stop and try again later
        break;
      }
    }
  }
  
  Serial.print("Successfully uploaded ");
  Serial.print(successCount);
  Serial.print(" out of ");
  Serial.print(bufferCount);
  Serial.println(" buffered readings");
  
  // Remove uploaded readings from the buffer
  if (successCount > 0) {
    bufferCount -= successCount;
    if (bufferCount == 0) {
      // All readings uploaded, reset buffer
      bufferIndex = 0;
      // Delete the file
      SPIFFS.remove(dataFile);
      Serial.println("All buffered readings uploaded and file deleted");
    }
  }
}

// Function to upload data to TimescaleDB via API
void uploadToDatabase(float totalPower_kW, float periodEnergy_kWh) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Buffering data...");
    // Buffer the reading for later upload
    bufferReading(totalPower_kW / READINGS_TO_UPLOAD, periodEnergy_kWh);
    return;
  }

  HTTPClient http;
  http.begin(apiEndpoint);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON document - using JsonDocument instead of DynamicJsonDocument
  JsonDocument doc;
  doc["time"] = getISOTimeString();
  doc["device_id"] = deviceId;
  doc["power_kw"] = totalPower_kW / READINGS_TO_UPLOAD; // Average power over period
  doc["energy_kwh"] = periodEnergy_kWh;                 // Total energy over period
  
  String requestBody;
  serializeJson(doc, requestBody);
  
  Serial.println("Uploading data to database:");
  Serial.println(requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.println(response);
  } else {
    Serial.print("Error on sending POST: ");
    Serial.println(httpResponseCode);
    // Buffer the reading for later upload
    bufferReading(totalPower_kW / READINGS_TO_UPLOAD, periodEnergy_kWh);
  }
  
  http.end();
}


void loop() {
  // Check WiFi connection and try to reconnect if disconnected
  checkWiFiConnection();
  
  // Take readings at regular intervals
  unsigned long currentMillis = millis();
  if (currentMillis - lastMeasurementTime >= MEASUREMENT_INTERVAL) {
    lastMeasurementTime = currentMillis;
    
    // Measure current
    double irms = emon1.calcIrms(1480);
    
    // If we're still in stabilization period, ignore readings
    if (!isStabilized) {
      stabilizationCount++;
      if (stabilizationCount >= STABILIZATION_PERIOD) {
        isStabilized = true;
        Serial.println("Sensor stabilized. Starting to collect readings.");
      } else {
        Serial.print("Stabilizing... ");
        Serial.print(stabilizationCount);
        Serial.print("/");
        Serial.println(STABILIZATION_PERIOD);
        return; // Skip this reading
      }
    }
    
    // Calculate power (KW)
    double powerKW = (irms * VOLTAGE) / 1000.0;
    
    // Calculate energy used for this 1-second interval
    float energyKWh = powerKW / 3600.0; // kWh = kW * hours (1 second = 1/3600 hour)
      
    // Store the readings
    currentReadings[readingIndex] = irms;
    powerReadings[readingIndex] = powerKW;
    totalEnergy_kWh += energyKWh;

    // Print readings to serial
    Serial.print("Reading #");
    Serial.print(readingIndex + 1);
    Serial.print(" Current: ");
    Serial.print(irms, 3);
    Serial.print("A, Power: ");
    Serial.print(powerKW, 3);
    Serial.print("kW, Energy: ");
    Serial.print(energyKWh, 6);
    Serial.println("kWh");

    readingIndex++;

    // Check if we have collected enough readings to upload
    if (readingIndex >= READINGS_TO_UPLOAD) {
      // Calculate total power over the period
      float totalPower_kW = 0;
      for (int i = 0; i < READINGS_TO_UPLOAD; i++) {
        totalPower_kW += powerReadings[i];
      }
      
      // Upload to database
      uploadToDatabase(totalPower_kW, totalEnergy_kWh);
      
      // Reset for next cycle
      readingIndex = 0;
      totalEnergy_kWh = 0;
      
      Serial.println("----------- Upload complete, starting new cycle -----------");
    }
  }
}

