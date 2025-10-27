#ifndef RCCOMB_COMMON_HPP
#define RCCOMB_COMMON_HPP

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <exception>
#include <limits>
#include <vector>

#ifdef RCCOMB_DEBUG
#include <cstdio>
#include <string>
#endif

namespace rccomb {

#ifdef RCCOMB_DEBUG
#define RCCOMB_DEBUG_PRINT(fmt, ...)                              \
  do {                                                            \
    std::fprintf(stderr, "[%s:%d] " fmt, __FILE_NAME__, __LINE__, \
                 ##__VA_ARGS__);                                  \
  } while (0)
#else
#define RCCOMB_DEBUG_PRINT(fmt, ...) \
  do {                               \
  } while (0)
#endif

enum class result_t {
  SUCCESS,
  SEARCH_SPACE_TOO_LARGE,
  BROKEN_TOPOLOGY,
  INACCURATE_RESULT,
  NEGATIVE_VALUE,
};

static inline const char* result_to_string(result_t res) {
  switch (res) {
    case result_t::SUCCESS:
      return "Success.";
    case result_t::SEARCH_SPACE_TOO_LARGE:
      return "The search space is too large.";
    case result_t::BROKEN_TOPOLOGY:
      return "The topology is broken.";
    case result_t::INACCURATE_RESULT:
      return "Inaccurate result.";
    case result_t::NEGATIVE_VALUE:
      return "A negative value was encountered.";
    default:
      return "Unknown result.";
  }
}

enum class ComponentType {
  Resistor,
  Capacitor,
};

using value_t = double;

static constexpr value_t VALUE_NONE = -1;
static constexpr value_t VALUE_POSITIVE_INFINITY =
    std::numeric_limits<value_t>::infinity();
static constexpr value_t VALUE_NEGATIVE_INFINITY = -VALUE_POSITIVE_INFINITY;

inline bool value_is_valid(value_t v) {
  return 0 < v && v < VALUE_POSITIVE_INFINITY;
}

using hash_t = uint32_t;

extern uint32_t next_object_id;
inline uint32_t generate_object_id() { return next_object_id++; }

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

value_t pow10(float exp);
std::string value_to_json_string(value_t value);

#ifdef RCCOMB_IMPLEMENTATION

uint32_t next_object_id = 1;

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

value_t pow10(float exp) {
  int exp_i = std::floor(exp);
  int exp_u = std::abs(exp_i);
  value_t ret = 1;
  value_t mul = 10.0;
  while (exp_u != 0) {
    if (exp_u & 1) {
      ret *= mul;
    }
    mul *= mul;
    exp_u >>= 1;
  }
  if (exp_i < 0) {
    ret = 1.0 / ret;
  }
  ret *= pow(10.0, exp - exp_i);
  return ret;
}

std::string value_to_json_string(value_t value) {
  int exp = std::floor(std::log10(value) + 1e-6);
  if (exp >= -3 && exp <= 6) {
    return std::to_string(value);
  } else {
    value /= pow10(exp);
    return std::to_string(value) + "e" + std::to_string(exp);
  }
}

#endif

}  // namespace rccomb

#endif
