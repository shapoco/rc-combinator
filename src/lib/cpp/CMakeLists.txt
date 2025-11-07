set(LIB_NAME rcmb)
set(SRC_DIR src)
set(INC_DIR include)

file(GLOB CPP_FILES
    ${SRC_DIR}/*.cpp
)

add_library(${LIB_NAME} STATIC
    ${CPP_FILES}
)

target_compile_options(${LIB_NAME} PUBLIC -O2 -Wall)
target_compile_features(${LIB_NAME} PUBLIC cxx_std_20)

target_include_directories(${LIB_NAME} PUBLIC
    ${INC_DIR}
)
