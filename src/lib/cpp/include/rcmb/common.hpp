#ifndef RCMB_COMMON_HPP
#define RCMB_COMMON_HPP

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <exception>
#include <limits>
#include <vector>

#ifdef RCMB_DEBUG
#include <cstdio>
#include <string>
#endif

namespace rcmb {

#ifdef RCMB_DEBUG
#define RCMB_DEBUG_PRINT(fmt, ...)                                \
  do {                                                            \
    std::fprintf(stderr, "[%s:%d] " fmt, __FILE_NAME__, __LINE__, \
                 ##__VA_ARGS__);                                  \
  } while (0)
#else
#define RCMB_DEBUG_PRINT(fmt, ...) \
  do {                             \
  } while (0)
#endif

enum class result_t {
  SUCCESS,
  SEARCH_SPACE_TOO_LARGE,
  BROKEN_TOPOLOGY,
  INACCURATE_RESULT,
  PARAMETER_OUT_OF_RANGE,
  PARAMETER_RANGE_REVERSAL,
  INVALID_ELEMENT_VALUE_LIST,
  INTERNAL_CORRUPTION,
};

enum class topology_constraint_t {
  SERIES = 1,
  PARALLEL = 2,
  NO_LIMIT = 3,
};

static const int MAX_COMBINATION_ELEMENTS = 15;

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
    case result_t::PARAMETER_OUT_OF_RANGE:
      return "Parameter out of range.";
    case result_t::PARAMETER_RANGE_REVERSAL:
      return "Parameter range reversal.";
    case result_t::INVALID_ELEMENT_VALUE_LIST:
      return "Invalid element value list.";
    case result_t::INTERNAL_CORRUPTION:
      return "Internal corruption.";
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

extern uint32_t next_object_id;
inline uint32_t generate_object_id() { return next_object_id++; }

static inline std::vector<value_t> sort_values(
    const std::vector<value_t>& values) {
  std::vector<value_t> sorted_values = values;
  std::sort(sorted_values.begin(), sorted_values.end());
  return sorted_values;
}

value_t pow10(int exp);
uint32_t valueKeyOf(value_t value);
std::string value_to_json_string(value_t value);

#ifdef RCMB_IMPLEMENTATION

uint32_t next_object_id = 1;

value_t pow10(int exp) {
  bool neg = exp < 0;
  if (neg) exp = -exp;
  value_t ret = 1;
  if (exp & 0x01) ret *= 1e1;
  if (exp & 0x02) ret *= 1e2;
  if (exp & 0x04) ret *= 1e4;
  if (exp & 0x08) ret *= 1e8;
  if (exp & 0x10) ret *= 1e16;
  if (exp & 0x20) ret *= 1e32;
  return neg ? (1 / ret) : ret;
}

uint32_t valueKeyOf(value_t value) {
  int exp = std::floor(std::log10(value) + 1e-6) - 6;
  uint32_t frac = static_cast<uint32_t>(std::round(value * pow10(-exp)));
  return (exp + 128) << 24 | (frac & 0x00FFFFFF);
}

std::string value_to_json_string(value_t value) {
  int exp = std::floor(std::log10(value) + 1e-6);
  exp = static_cast<int>(std::floor(static_cast<float>(exp) / 3)) * 3;
  char buffer[32];
  if (-6 <= exp && exp < 6) {
    std::snprintf(buffer, sizeof(buffer), "%.12lg", value);
  } else {
    if (exp > 0) {
      value /= pow10(exp);
    } else {
      value *= pow10(-exp);
    }
    std::snprintf(buffer, sizeof(buffer), "%.12lge%d", value, exp);
  }
  return std::string(buffer);
}

#endif

}  // namespace rcmb

#endif
