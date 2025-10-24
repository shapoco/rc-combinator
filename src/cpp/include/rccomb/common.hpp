#ifndef RCCOMB_COMMON_HPP
#define RCCOMB_COMMON_HPP

#include <algorithm>
#include <cstdint>
#include <vector>

#ifdef RCCOMB_DEBUG
#include <stdio.h>
#include <string>
#endif

namespace rccomb {

#ifdef RCCOMB_DEBUG
#define RCCOMB_DEBUG_PRINT(fmt, ...)                                \
  do {                                                              \
    printf("[%s:%d] " fmt, __FILE_NAME__, __LINE__, ##__VA_ARGS__); \
  } while (0)
#else
#define RCCOMB_DEBUG_PRINT(fmt, ...) \
  do {                               \
  } while (0)
#endif

enum class ComponentType {
  Resistor,
  Capacitor,
};

using value_t = double;

static constexpr value_t VALUE_NONE = -1;

using hash_t = uint32_t;

static inline std::vector<value_t> sort_values(
    const std::vector<value_t>& values) {
  std::vector<value_t> sorted_values = values;
  std::sort(sorted_values.begin(), sorted_values.end());
  return sorted_values;
}

hash_t crc32_add_u8(hash_t h, uint8_t data);

static inline hash_t crc32_add_u16(hash_t h, uint16_t data) {
  h = crc32_add_u8(h, static_cast<uint8_t>(data & 0xFF));
  h = crc32_add_u8(h, static_cast<uint8_t>((data >> 8) & 0xFF));
  return h;
}

static inline hash_t crc32_add_u32(hash_t h, uint32_t data) {
  h = crc32_add_u8(h, static_cast<uint8_t>(data & 0xFF));
  h = crc32_add_u8(h, static_cast<uint8_t>((data >> 8) & 0xFF));
  h = crc32_add_u8(h, static_cast<uint8_t>((data >> 16) & 0xFF));
  h = crc32_add_u8(h, static_cast<uint8_t>((data >> 24) & 0xFF));
  return h;
}

#ifdef RCCOMB_IMPLEMENTATION

static constexpr uint32_t POLY = 0xEDB88320;

hash_t crc32_add_u8(hash_t h, uint8_t data) {
  for (int i = 0; i < 8; ++i) {
    bool bit = ((data >> i) & 1) != 0;
    bool lsb = (h & 1) != 0;
    h >>= 1;
    if (lsb ^ bit) {
      h ^= POLY;
    }
  }
  return h;
}

#endif

}  // namespace rccomb

#endif
