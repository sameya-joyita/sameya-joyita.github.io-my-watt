//home_screen.c
#include "home_screen.h"
#include <lvgl.h>
#include <stdio.h>  // For sprintf/snprintf

static lv_style_t lv_style_plain;
static lv_style_t style_large_font;
static lv_style_t style_button_small_font;
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
    lv_style_set_text_font(&style_large_font, &lv_font_montserrat_24);
    
    // Initialize the small font style for the button
    lv_style_init(&style_button_small_font);
    lv_style_set_text_font(&style_button_small_font, &lv_font_montserrat_16);
    
    // Initialize the lightning symbol font style
    lv_style_init(&style_lightning_font);
    lv_style_set_text_font(&style_lightning_font, &lv_font_montserrat_48); 
    lv_style_set_text_color(&style_lightning_font, lv_color_black()); 
    
    // Create a half-circle meter
    meter = lv_arc_create(parent);
    lv_obj_set_size(meter, 200, 200); 
    lv_obj_align(meter, LV_ALIGN_CENTER, -130, 40);
    lv_arc_set_range(meter, 0, 100);
    lv_arc_set_value(meter, 0); // Initial value
    lv_arc_set_bg_angles(meter, 180, 360);
    lv_obj_add_style(meter, &lv_style_plain, LV_PART_KNOB | LV_STATE_DEFAULT);
    lv_obj_clear_flag(meter, LV_OBJ_FLAG_CLICKABLE); // Make it non-clickable
    
    // Add a lightning symbol inside the meter ring
    lv_obj_t *lightning_label = lv_label_create(parent);
    lv_label_set_text(lightning_label, LV_SYMBOL_CHARGE); // Use the lightning symbol
    lv_obj_align_to(lightning_label, meter, LV_ALIGN_CENTER, 0, -26); // Position inside the ring
    lv_obj_add_style(lightning_label, &style_lightning_font, 0);
        
    // Create a label for the power value - store reference for later updates
    power_label = lv_label_create(parent);
    lv_label_set_text(power_label, "Energy: 0.000 kWh"); // Initial value
    lv_obj_align_to(power_label, meter, LV_ALIGN_OUT_RIGHT_MID, 30, -90); 
    lv_obj_add_style(power_label, &style_large_font, 0);
    
    // Create a label for the cost
    cost_label = lv_label_create(parent);
    lv_label_set_text(cost_label, "Cost: 0.00"); // Initial value without £ symbol
    lv_obj_align_to(cost_label, power_label, LV_ALIGN_OUT_BOTTOM_LEFT, 0, 10);
    lv_obj_add_style(cost_label, &style_large_font, 0);
    
    // Create a button to switch options
    lv_obj_t *option_btn = lv_btn_create(parent);
    lv_obj_set_size(option_btn, 160, 40); // Adjust the size to display full text
    lv_obj_align_to(option_btn, cost_label, LV_ALIGN_OUT_BOTTOM_LEFT, 0, 20);
    
    lv_obj_add_style(option_btn, &style_button_small_font, 0);
    option_label = lv_label_create(option_btn);
    lv_label_set_text(option_label, "So Far Today"); // Default text
    lv_obj_add_style(option_label, &style_button_small_font, 0);
    
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
        // Assuming max power is 10 kW, adjust if needed
        int meter_value = (int)(power_kw * 10); // Scale factor of 10
        if (meter_value > 100) meter_value = 100;
        if (meter_value < 0) meter_value = 0;
        
        lv_arc_set_value(meter, meter_value);
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