//home_screen.c
#include "home_screen.h"
#include <lvgl.h>
#include <stdio.h>  // For sprintf/snprintf

static lv_style_t lv_style_plain;
static lv_style_t style_large_font;
static lv_style_t style_button_font;
static lv_style_t style_lightning_font; 
// Global reference to labels for updating
static lv_obj_t *power_label;
static lv_obj_t *cost_label;
// Global reference to the meter
static lv_obj_t *meter;
// Track current view mode (daily or current)
static bool daily_view = true;
// Button label reference
static lv_obj_t *option_label;

void option_btn_event_cb(lv_event_t *e);
extern bool view_changed; // External flag to indicate view changed

void home_screen_create(lv_obj_t *parent) {
    // Initialize the plain style
    lv_style_init(&lv_style_plain);
    
    // Initialize the large font style
    lv_style_init(&style_large_font);
    lv_style_set_text_font(&style_large_font, &lv_font_montserrat_28); // Set font size to 28
    lv_style_set_text_color(&style_large_font, lv_color_white()); // White text
    
    // Initialize the button font style 
    lv_style_init(&style_button_font);
    //lv_style_set_bg_color(&style_button_font, lv_color_black()); // Black button
    lv_style_set_text_color(&style_button_font, lv_color_white()); // White text
    lv_style_set_text_font(&style_button_font, &lv_font_montserrat_20); 
    lv_style_set_text_align(&style_button_font, LV_TEXT_ALIGN_CENTER); // Ensure text is centered
    
    // Initialize the lightning symbol font style
    lv_style_init(&style_lightning_font);
    //lv_style_set_text_font(&style_lightning_font, &lv_font_montserrat_48);
    lv_style_set_text_color(&style_lightning_font, lv_color_hex(0xF4FF3E)); // color for lightning symbol
    
    // Create a half-circle meter
    meter = lv_arc_create(parent);
    lv_obj_set_size(meter, 200, 200); // Adjust the size as needed
    lv_obj_align(meter, LV_ALIGN_CENTER, -130, 40); // Align
    lv_arc_set_range(meter, 0, 100);
    lv_arc_set_value(meter, 0); // Initial value
    lv_arc_set_bg_angles(meter, 180, 360);
    
    // Set initial color for both indicator and knob (green at 0%)
    lv_obj_set_style_arc_color(meter, lv_color_hex(0x8BC34A), LV_PART_INDICATOR);
    lv_obj_set_style_bg_color(meter, lv_color_hex(0x8BC34A), LV_PART_KNOB);
    
    lv_obj_clear_flag(meter, LV_OBJ_FLAG_CLICKABLE); // Make it non-clickable
    
    // Add a lightning symbol inside the meter ring
    lv_obj_t *lightning_label = lv_label_create(parent);
    lv_label_set_text(lightning_label, LV_SYMBOL_CHARGE); // Use the lightning symbol
    //lv_obj_align_to(lightning_label, meter, LV_ALIGN_CENTER, 0, -26); // Position inside the ring
    lv_obj_add_style(lightning_label, &style_lightning_font, 0);
    lv_obj_set_size(lightning_label, 80, 80); // Adjust size manually
    lv_obj_align_to(lightning_label, meter, LV_ALIGN_CENTER, 0, -40);      
    // Create a label for the power value - store reference for later updates
    power_label = lv_label_create(parent);
    lv_label_set_text(power_label, "Energy: 0.000 kWh"); // Initial value
    lv_obj_align_to(power_label, meter, LV_ALIGN_OUT_RIGHT_MID, 30, -90); 
    lv_obj_add_style(power_label, &style_large_font, 0);
    
    // Create a label for the cost
    cost_label = lv_label_create(parent);
    lv_label_set_text(cost_label, "Cost: 0.00"); 
    lv_obj_align_to(cost_label, power_label, LV_ALIGN_OUT_BOTTOM_LEFT, 0, 10);
    lv_obj_add_style(cost_label, &style_large_font, 0);
    
    // Create a button to switch options
    lv_obj_t *option_btn = lv_btn_create(parent);
    lv_obj_set_size(option_btn, 220, 60); // Increased size from 160,40 to 220,60
    lv_obj_align_to(option_btn, cost_label, LV_ALIGN_OUT_BOTTOM_LEFT, 0, 30); // Increased spacing too
    lv_obj_add_style(option_btn, &style_button_font, 0);

    option_label = lv_label_create(option_btn);
    lv_label_set_text(option_label, "So Far Today"); // Default text
    lv_obj_center(option_label); // Center align the text in the button
    lv_obj_add_style(option_label, &style_button_font, 0);
    
    // Add an event handler to the button
    lv_obj_add_event_cb(option_btn, option_btn_event_cb, LV_EVENT_CLICKED, NULL);
}

// Function to update the power display with data from Usage Now API
void home_screen_update_power(float power_kw, float rate) {
    if (power_label != NULL) {
        char power_text[32];
        char cost_text[32];
        
        snprintf(power_text, sizeof(power_text), "Power: %.3f kW", power_kw);
        lv_label_set_text(power_label, power_text);
        
        // For Usage Now, display the rate in the cost label
        snprintf(cost_text, sizeof(cost_text), "Rate: %.2f/kWh", rate);
        lv_label_set_text(cost_label, cost_text);
        
        // Update the meter value (scale the power to 0-100 range)
        // Now assuming max power is 1 kW, as requested
        int meter_value = (int)(power_kw * 100); // Scale factor of 100 (since 1kW is max)
        if (meter_value > 100) meter_value = 100;
        if (meter_value < 0) meter_value = 0;
        
        lv_arc_set_value(meter, meter_value);
        
        // Set color based on the value
        lv_color_t meter_color;
        if (meter_value < 50) {
            // Less than 50% - Green
            meter_color = lv_color_hex(0x8BC34A);
        } else if (meter_value < 80) {
            // Between 50% and 80% - Orange
            meter_color = lv_color_hex(0xFFA500);
        } else {
            // Above 80% - Red
            meter_color = lv_color_hex(0xFF0000);
        }
        
        // Apply color to both the indicator arc and the knob
        lv_obj_set_style_arc_color(meter, meter_color, LV_PART_INDICATOR);
        lv_obj_set_style_bg_color(meter, meter_color, LV_PART_KNOB);
    }
}

// Function to update the daily usage display with data from daily usage API
void home_screen_update_daily_usage(float total_energy, float total_cost) {
    if (power_label != NULL && cost_label != NULL) {
        char energy_text[32];
        char cost_text[32];
        
        snprintf(energy_text, sizeof(energy_text), "Energy: %.3f kWh", total_energy);
        snprintf(cost_text, sizeof(cost_text), "Cost: %.2f", total_cost);
        
        lv_label_set_text(power_label, energy_text);
        lv_label_set_text(cost_label, cost_text);
        
        // Update the meter value based on energy (assuming max daily energy of 20 kWh)
        int meter_value = (int)(total_energy * 5); // Scale factor of 5
        if (meter_value > 100) meter_value = 100;
        if (meter_value < 0) meter_value = 0;
        
        lv_arc_set_value(meter, meter_value);
        
        // Set color based on the value
        lv_color_t meter_color;
        if (meter_value < 50) {
            // Less than 50% - Green
            meter_color = lv_color_hex(0x8BC34A);
        } else if (meter_value < 80) {
            // Between 50% and 80% - Orange
            meter_color = lv_color_hex(0xFFA500);
        } else {
            // Above 80% - Red
            meter_color = lv_color_hex(0xFF0000);
        }
        
        // Apply color to both the indicator arc and the knob
        lv_obj_set_style_arc_color(meter, meter_color, LV_PART_INDICATOR);
        lv_obj_set_style_bg_color(meter, meter_color, LV_PART_KNOB);
    }
}

// Show loading indicators when waiting for data
void home_screen_show_loading() {
    if (daily_view) {
        lv_label_set_text(power_label, "Energy: loading...");
        lv_label_set_text(cost_label, "Cost: loading...");
    } else {
        lv_label_set_text(power_label, "Power: loading...");
        lv_label_set_text(cost_label, "Rate: loading...");
    }
}

// Function to toggle between daily view and current view
void home_screen_toggle_view(bool is_daily_view) {
    daily_view = is_daily_view;
    
    if (option_label) {
        if (is_daily_view) {
            lv_label_set_text(option_label, "So Far Today");
        } else {
            lv_label_set_text(option_label, "Usage Now");
        }
    }
}

// Function to check if we're in daily view mode
bool home_screen_is_daily_view() {
    return daily_view;
}

void option_btn_event_cb(lv_event_t *e) {
    // Toggle the view mode
    daily_view = !daily_view;
    
    // Update the button text
    if (daily_view) {
        lv_label_set_text(option_label, "So Far Today");
    } else {
        lv_label_set_text(option_label, "Usage Now");
    }
    
    // Show loading indicators while we fetch new data
    home_screen_show_loading();
    
    // Set the flag to indicate the view has changed (will trigger fetch in timer)
    view_changed = true;
}