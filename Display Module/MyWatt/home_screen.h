#pragma once 
#include <lvgl.h> 

void home_screen_create(lv_obj_t *parent); 
void home_screen_update_power(float power_kw, float rate); 
void home_screen_update_daily_usage(float total_energy, float total_cost); 
void home_screen_toggle_view(bool is_daily_view); 
bool home_screen_is_daily_view();
void home_screen_show_loading();