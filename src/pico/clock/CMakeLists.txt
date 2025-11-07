cmake_minimum_required(VERSION 3.12)

set(APP_NAME rcmb_clock)
set(INC_DIR include)
set(SRC_DIR src)
set(REPO_DIR ../../..)
set(RCMB_DIR ../../lib/cpp)
set(LGFX_DIR ${REPO_DIR}/submodules/LovyanGFX)
# set(LIB_DIR ../../lib)

# option(BOARD_PICO_W "Enable Pico W Functions" OFF) 
# option(WIFI_SSID "WiFi SSID" "") 
# option(WIFI_PASS "WiFi Pass Phrase" "") 

# Pull in PICO SDK (must be before project)
set(PICO_SDK_PATH $ENV{PICO_SDK_PATH})
include(${PICO_SDK_PATH}/pico_sdk_init.cmake)

project(${APP_NAME} C CXX ASM)

# Initialize the SDK
pico_sdk_init()

add_executable(${APP_NAME})

# target_compile_options(${APP_NAME} PUBLIC -O2 -Wall)
# target_compile_features(${APP_NAME} PUBLIC c_std_11)
# target_compile_features(${APP_NAME} PUBLIC cxx_std_17)
# 
# if(PICO_BOARD STREQUAL pico_w)
#     target_compile_definitions(${APP_NAME} PRIVATE
#         BOARD_PICO_W
#         ENABLE_NTP_SERVER
#         WIFI_SSID=\"$(WIFI_SSID)\"
#         WIFI_PASS=\"$(WIFI_PASS)\"
#     )
#     set(ADDITIONAL_LIBS
#         pico_cyw43_arch_lwip_poll
#     )
# endif()

# add_subdirectory(${LGFX_DIR} lgfx)
add_subdirectory(${RCMB_DIR} rcmb   )

file(GLOB CPP_FILES
#     ${LIB_DIR}/shapoco/*.cpp
#     ${LIB_DIR}/shapoco/graphics/*.cpp
#     ${LIB_DIR}/shapoco/pico/*.cpp
#     ${LIB_DIR}/shapoco/jjy/*.cpp
    ${SRC_DIR}/*.cpp
#     ${SRC_DIR}/fonts/*.cpp
)

target_sources(${APP_NAME} PRIVATE 
    ${CPP_FILES}
)

target_include_directories(${APP_NAME} PRIVATE
    ${INC_DIR}
    ${SRC_DIR}
    ${RCMB_DIR}/include
#    ${LGFX_DIR}/src
#     ${LIB_DIR}
)

target_link_libraries(${APP_NAME} PRIVATE
    pico_stdlib
    hardware_clocks
    rcmb
#    pico_multicore
#    hardware_dma
#    hardware_pwm
#    hardware_adc
#    hardware_spi
#    hardware_i2c
#    LovyanGFX
#    ${ADDITIONAL_LIBS}
)

pico_enable_stdio_usb(${APP_NAME} 1)
pico_enable_stdio_uart(${APP_NAME} 0)

pico_add_extra_outputs(${APP_NAME})
